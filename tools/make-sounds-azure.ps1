# Makes the 41 phonics sound clips in audio/sounds/ with an Azure neural voice, then
# lists them in audio/clips.js.
#
#   powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1
#   powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -Voice en-US-JennyNeural
#   powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -Only s,z,f
#   powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -Only s,t,ee -OutDir audio\_compare -Tag dragon
#
# Needs two settings holding an Azure Speech key and its region. They are read from your
# own environment and never stored here:
#
#   setx SPEECH_KEY "..."
#   setx SPEECH_REGION "eastus"
#
# This is the one step that needs the internet: each sound is synthesised by Azure and
# saved here. The game itself never calls it - it only ever plays these files.
# tools/make-sounds.ps1 does the same job offline with the voices built into Windows.
#
# A voice given ordinary text cannot say a sound on its own ("s" comes out as "ess"), so
# every sound is asked for as a phonetic symbol instead. Held sounds (s, m, ee ...) are
# spoken slowly so they last long enough to hear; quick sounds (t, p, k ...) at normal
# speed so they stay crisp. Each clip is then trimmed and brought to the same loudness.
param(
  [string]$Voice = 'en-US-AvaNeural',
  [string[]]$Only = @(),
  [string]$OutDir = 'audio\sounds',
  [string]$Tag = '',         # prefixes the file names, for comparing voices side by side
  [string]$WordsFile = '',   # a list of whole words or syllables to record into audio/words
  [switch]$Force,            # remake word clips that are already there
  [string]$Ipa = '',         # try a different phonetic spelling for the one sound in -Only
  [double]$KeepMs = 95,      # how much of the vowel to keep on a sound cut short of one
  [int]$Rate = 0,            # sample rate in Hz; 0 means 48000. 24000 suits whole words
  [switch]$Spoken,           # write to audio\spoken (whole words and phrases) not audio\words
  [switch]$Mp3               # encoded rather than PCM; for clips that are played on their own
)

$ErrorActionPreference = 'Stop'
# "-Only s,t,ee" arrives as one string when this script is run with powershell -File
$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root $OutDir
New-Item -ItemType Directory -Force $out | Out-Null

function Get-Setting($name) {
  foreach ($scope in 'Process', 'User', 'Machine') {
    $v = [Environment]::GetEnvironmentVariable($name, $scope)
    if ($v) { return $v.Trim() }
  }
  return $null
}
$KEY = Get-Setting 'SPEECH_KEY'
$REGION = Get-Setting 'SPEECH_REGION'
if (-not $KEY) { throw 'SPEECH_KEY is not set. See the notes at the top of this script.' }
if (-not $REGION) { throw 'SPEECH_REGION is not set (for example "eastus").' }

# id, phonetic symbol(s) (IPA; each special letter is written as its <hex> code so this
# file stays plain ASCII for Windows PowerShell), speed
$SOUNDS = @(
  @('b', 'b', 'medium'), @('d', 'd', 'medium'), @('g', '<0261>', 'medium'), @('k', 'k', 'medium'),
  @('p', 'p', 'medium'), @('t', 't', 'medium'), @('ch', 't<0283>', 'medium'), @('j', 'd<0292>', 'medium'),
  @('kw', 'kw', 'medium'), @('ks', 'ks', 'medium'), @('h', 'h', 'x-slow'),
  @('f', 'f', 'x-slow'), @('l', 'l', 'x-slow'), @('m', 'm', 'x-slow'), @('n', 'n', 'x-slow'),
  @('r', '<0279>', 'x-slow'), @('s', 's', 'x-slow'), @('v', 'v', 'x-slow'), @('w', 'w', 'x-slow'),
  @('y', 'j', 'x-slow'), @('z', 'z', 'x-slow'), @('sh', '<0283>', 'x-slow'), @('th', '<03b8>', 'x-slow'),
  @('dh', '<00f0>', 'x-slow'), @('ng', '<014b>', 'x-slow'),
  @('a', '<00e6>', 'x-slow'), @('e', '<025b>', 'x-slow'), @('i', '<026a>', 'x-slow'), @('o', '<0251>', 'x-slow'),
  @('u', '<028c>', 'x-slow'), @('ay', 'e<026a>', 'x-slow'), @('ee', 'i', 'x-slow'), @('igh', 'a<026a>', 'x-slow'),
  @('oh', 'o<028a>', 'x-slow'), @('yoo', 'ju', 'x-slow'), @('oo', 'u', 'x-slow'),
  @('uu', '<028a>', 'x-slow'), @('ow', 'a<028a>', 'x-slow'),
  @('oi', '<0254><026a>', 'x-slow'), @('aw', '<0254>', 'x-slow'), @('ar', '<0251><0279>', 'x-slow'),
  @('or', '<0254><0279>', 'x-slow'), @('er', '<025d>', 'x-slow')
)

# The sounds this voice releases into a vowel, and so need cutting short of it.
#
# /b/, /d/ and /g/ are the awkward ones. Asked for one on its own the voice answers "buh",
# "duh", "guh" - most of the clip is a schwa, and a schwa that long is the "tuh" habit
# that stops a child blending. So the vowel is cut: IPA_OVERRIDE says what to ask for and
# CUT_BEFORE_VOWEL says to stop just past where the vowel begins.
#
# How far past is the whole question, and cutting too close was the first mistake. What
# makes a /b/ a /b/ rather than a /d/ is not the burst - the bursts are alike - it is the
# way the formants bend out of it into whatever follows. Cut that away and all three
# collapse into the same short click, which is heard as a hiss rather than as a letter.
# So enough of the vowel is kept to carry the bend, and no more: a tenth of a second,
# quiet and unstressed, which is how these are taught out loud anyway.
#
# The vowel asked for is a schwa, the most neutral one there is, so the bend it leaves
# behind does not colour the sound towards any particular word.
#
# Asking for the end of a syllable ("ob") was tried too. It gives a burst with no vowel
# after it, but the voicing during the closure then outweighs the burst once the clip is
# brought up to the same loudness as the rest, and it sounds like a hum with a click.
$CUT_BEFORE_VOWEL = @('b', 'd', 'g')
$CUT_AFTER_VOWEL = @()
$IPA_OVERRIDE = @{ b = "b$([char]0x0259)"; d = "d$([char]0x0259)"; g = "$([char]0x0261)$([char]0x0259)" }

# The single sounds are asked for at 48 kHz because fricatives like s, f and th carry
# most of themselves above 5 kHz, and that is the first thing a narrow band throws away.
# A whole word does not need the same: nothing in "basket" lives above 12 kHz, and at
# 24 kHz it is half the bytes for no audible difference. Both are plain uncompressed PCM,
# so neither has been through a lossy codec - the smaller one simply stops sooner.
$RATE = if ($Rate -gt 0) { $Rate } else { 48000 }
$FORMAT = if ($Mp3) { "audio-$([int]($RATE / 1000))khz-48kbitrate-mono-mp3" }
          else { "riff-$([int]($RATE / 1000))khz-16bit-mono-pcm" }
$EXT = if ($Mp3) { 'mp3' } else { 'wav' }
$ENDPOINT = "https://$REGION.tts.speech.microsoft.com/cognitiveservices/v1"

function Unescape-Ipa($s) {
  return [regex]::Replace($s, '<([0-9a-f]{4})>', { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) })
}

# Asks Azure to say one fragment of SSML and returns it as 16-bit samples. Some voices
# reject prosody, so a rejected request is tried once more without it.
function Get-Pcm($said, $speed) {
  $body = {
    param($withProsody)
    $inner = $said
    if ($withProsody) { $inner = "<prosody rate='$speed'>$inner</prosody>" }
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
      "<voice name='$Voice'>$inner</voice></speak>"
  }
  $headers = @{
    'Ocp-Apim-Subscription-Key' = $KEY
    'Content-Type'              = 'application/ssml+xml'
    'X-Microsoft-OutputFormat'  = $FORMAT
    'User-Agent'                = 'phonics-playground'
  }
  $tmp = [IO.Path]::GetTempFileName()
  try {
    $withProsody = $true
    $got = $false
    for ($attempt = 1; $attempt -le 6 -and -not $got; $attempt++) {
      try {
        $ssml = & $body $withProsody
        Invoke-WebRequest -Uri $ENDPOINT -Method Post -Headers $headers -UseBasicParsing `
          -Body ([Text.Encoding]::UTF8.GetBytes($ssml)) -OutFile $tmp -TimeoutSec 60
        $got = $true
      } catch {
        $code = $null
        try { $code = [int]$_.Exception.Response.StatusCode } catch { }
        if ($code -eq 400 -and $withProsody) { $withProsody = $false; continue }  # this voice will not be slowed
        # the free tier allows 20 requests a minute; wait it out rather than give up
        if ($code -eq 429) { Start-Sleep -Seconds (5 * $attempt); continue }
        if ($code -eq 401 -or $code -eq 403) { throw "Azure refused the key (HTTP $code)" }
        if ($code) { throw "Azure returned HTTP $code" }
        throw
      }
    }
    if (-not $got) { throw 'Azure kept refusing (HTTP 429): out of quota for now' }

    $raw = [IO.File]::ReadAllBytes($tmp)
    if ($raw.Length -lt 64) { throw 'Azure sent no audio' }
    # An encoded format is kept exactly as it arrived: there is no editing an mp3 without
    # decoding and re-encoding it, which would need a tool this script does not have and
    # would cost a generation of quality to no purpose.
    if ($FORMAT -notlike 'riff-*') { return ,$raw }
    # the samples start after the RIFF header's "data" marker
    $offset = 44
    for ($i = 0; $i -lt [Math]::Min($raw.Length - 4, 400); $i++) {
      if ($raw[$i] -eq 0x64 -and $raw[$i+1] -eq 0x61 -and $raw[$i+2] -eq 0x74 -and $raw[$i+3] -eq 0x61) { $offset = $i + 8; break }
    }
    $count = [int](($raw.Length - $offset) / 2)
    $pcm = New-Object 'int[]' $count
    for ($k = 0; $k -lt $count; $k++) { $pcm[$k] = [BitConverter]::ToInt16($raw, $offset + 2 * $k) }
    return ,$pcm
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}

function Write-Wav($path, [int[]]$pcm) {
  $fs = [IO.File]::Create($path)
  $w = New-Object IO.BinaryWriter($fs)
  $w.Write([Text.Encoding]::ASCII.GetBytes('RIFF')); $w.Write([int](36 + $pcm.Length * 2))
  $w.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt ')); $w.Write([int]16); $w.Write([int16]1); $w.Write([int16]1)
  $w.Write([int]$RATE); $w.Write([int]($RATE * 2)); $w.Write([int16]2); $w.Write([int16]16)
  $w.Write([Text.Encoding]::ASCII.GetBytes('data')); $w.Write([int]($pcm.Length * 2))
  foreach ($v in $pcm) { $w.Write([int16]$v) }
  $w.Close()
}

# Some stops come back released into a vowel: asked for /b/ the voice says "buh", which is
# the one habit that stops a child blending. A vowel is low and periodic - few zero
# crossings, nearly all its energy under about 500 Hz - where a burst is neither. So find
# where the vowel starts and cut just before it, keeping the closure and the burst.
# A vowel was first told apart from a burst by how much of it sits under 500 Hz, which
# worked for the /i/ of "bee" and not for a schwa - a schwa's first formant is higher, so
# it read as noise and the clip was never cut. What separates the two far more plainly is
# loudness: a burst is a faint tick, the vowel behind it is the loudest thing in the clip.
# So the vowel is taken to start at the first frame that is both at least half as loud as
# the clip's loudest moment and periodic rather than noisy.
function Trim-BeforeVowel([int[]]$pcm) {
  $frame = [int]($RATE * 0.01)

  $peak = 0.0
  for ($f = 0; $f + $frame -le $pcm.Length; $f += $frame) {
    $e = 0.0
    for ($k = 0; $k -lt $frame; $k++) { $e += [double]$pcm[$f + $k] * $pcm[$f + $k] }
    $rms = [Math]::Sqrt($e / $frame)
    if ($rms -gt $peak) { $peak = $rms }
  }
  if ($peak -le 0) { return ,$pcm }

  for ($f = 0; $f + $frame -le $pcm.Length; $f += $frame) {
    $e = 0.0; $z = 0
    for ($k = 0; $k -lt $frame; $k++) {
      $v = [double]$pcm[$f + $k]
      $e += $v * $v
      if ($k -gt 0 -and (($pcm[$f + $k] -ge 0) -ne ($pcm[$f + $k - 1] -ge 0))) { $z++ }
    }
    $rms = [Math]::Sqrt($e / $frame)
    if ($rms -gt $peak * 0.5 -and ($z / 0.01) -lt 2500) {
      # a shade past the vowel's start: the burst runs right up to it, and stopping dead
      # on the burst clips the very thing that tells a /b/ from a /d/
      $end = [Math]::Min($pcm.Length, $f + [int]($RATE * $KeepMs / 1000.0))
      return ,$pcm[0..($end - 1)]
    }
  }
  return ,$pcm
}

# The other way round: the clip opens with a vowel we do not want and ends with the sound
# we do. Find where the opening vowel stops sounding - the closure before the burst - and
# throw away everything before it.
function Trim-AfterVowel([int[]]$pcm) {
  $frame = [int]($RATE * 0.01)
  $peak = 0.0; $start = -1
  for ($f = 0; $f + $frame -le $pcm.Length; $f += $frame) {
    $e = 0.0
    for ($k = 0; $k -lt $frame; $k++) { $e += [double]$pcm[$f + $k] * $pcm[$f + $k] }
    $rms = [Math]::Sqrt($e / $frame)
    if ($rms -gt $peak) { $peak = $rms }
    if ($start -lt 0 -and $rms -gt 400) { $start = $f }
  }
  if ($start -lt 0 -or $peak -le 0) { return ,$pcm }

  # the closure: the first quiet stretch after the vowel has been going a little while
  $closure = -1
  for ($f = $start + 4 * $frame; $f + $frame -le $pcm.Length; $f += $frame) {
    $e = 0.0
    for ($k = 0; $k -lt $frame; $k++) { $e += [double]$pcm[$f + $k] * $pcm[$f + $k] }
    if ([Math]::Sqrt($e / $frame) -lt $peak * 0.12) { $closure = $f; break }
  }
  if ($closure -lt 0) { return ,$pcm }

  # then the burst itself: the clatter of the stop opening, which crosses zero far more
  # often than the voicing around it. Keep a little of the closure before it - a /b/ does
  # hum briefly - but not so much that the hum outweighs the burst once levelled.
  for ($f = $closure; $f + $frame -le $pcm.Length; $f += $frame) {
    $z = 0
    for ($k = 1; $k -lt $frame; $k++) {
      if (($pcm[$f + $k] -ge 0) -ne ($pcm[$f + $k - 1] -ge 0)) { $z++ }
    }
    if (($z / 0.01) -gt 2000) {
      $cut = [Math]::Max(0, $f - [int]($RATE * 0.025))
      return ,$pcm[$cut..($pcm.Length - 1)]
    }
  }
  $cut = [Math]::Max(0, $closure - [int]($RATE * 0.01))
  return ,$pcm[$cut..($pcm.Length - 1)]
}

# Trims the silence either side, brings the clip to the same loudness as the others and
# saves it. Returns how long it ended up, or 0 if the voice sent nothing but silence.
function Save-Clip([int[]]$pcm, $path, $maxGain = 25.0, $floorPct = 0.0) {
  # Where the sound is: first and last sample above a whisper. A stop trimmed back to its
  # burst opens with a near-silent closure that still clears a fixed threshold, leaving
  # dead air in front of the sound, so those clips measure the whisper against their own
  # loudest moment instead.
  $loudest = 1
  foreach ($v in $pcm) { if ([Math]::Abs($v) -gt $loudest) { $loudest = [Math]::Abs($v) } }
  $floor = [Math]::Max(60, $loudest * $floorPct)
  $first = -1; $last = -1
  for ($k = 0; $k -lt $pcm.Length; $k++) { if ([Math]::Abs($pcm[$k]) -gt $floor) { if ($first -lt 0) { $first = $k }; $last = $k } }
  if ($first -lt 0) { return 0 }

  $start = [Math]::Max(0, $first - [int]($RATE * 0.015))
  $end = [Math]::Min($pcm.Length - 1, $last + [int]($RATE * 0.03))
  $clip = $pcm[$start..$end]

  # same loudness for every sound: quiet ones like f and th are lifted, within reason
  $peak = 1; foreach ($v in $clip) { if ([Math]::Abs($v) -gt $peak) { $peak = [Math]::Abs($v) } }
  $gain = [Math]::Min(26000.0 / $peak, $maxGain)
  # a short clip that is mostly burst must not have its burst faded away: on a trimmed
  # stop the sound is at the very end, where a fixed 15 ms fade lands right on top of it
  $fadeIn = [int]($RATE * 0.003)
  $fadeOut = [Math]::Min([int]($RATE * 0.015), [int]($clip.Length * 0.06))
  for ($k = 0; $k -lt $clip.Length; $k++) {
    $g = $gain
    if ($k -lt $fadeIn) { $g *= $k / $fadeIn }
    if ($k -gt $clip.Length - 1 - $fadeOut) { $g *= ($clip.Length - 1 - $k) / $fadeOut }
    $clip[$k] = [int][Math]::Max(-32767, [Math]::Min(32767, [Math]::Round($clip[$k] * $g)))
  }

  Write-Wav $path $clip
  return [int]($clip.Length * 1000 / $RATE)
}

Write-Output "Voice: $Voice   Region: $REGION   Out: $OutDir"
$made = @()
$failed = @()
foreach ($s in $SOUNDS) {
  $id = $s[0]
  if ($Only.Count -and $Only -notcontains $id) { continue }
  if ($WordsFile) { break }        # a word run leaves the sounds alone

  $ask = if ($Ipa -and $Only.Count -eq 1) { $Ipa }
         elseif ($IPA_OVERRIDE.ContainsKey($id)) { $IPA_OVERRIDE[$id] }
         else { $s[1] }
  try {
    $pcm = Get-Pcm "<phoneme alphabet='ipa' ph='$(Unescape-Ipa $ask)'>x</phoneme>" $s[2]
  } catch {
    Write-Output "  $id  FAILED: $($_.Exception.Message)"; $failed += $id; continue
  }

  if ($CUT_BEFORE_VOWEL -contains $id) { $pcm = Trim-BeforeVowel $pcm }
  if ($CUT_AFTER_VOWEL -contains $id) { $pcm = Trim-AfterVowel $pcm }

  $name = if ($Tag) { "$Tag-$id.wav" } else { "$id.wav" }
  # a clip cut back to its burst has lost its loudest part, so it may be lifted further
  $lift = if (($CUT_BEFORE_VOWEL -contains $id) -or ($CUT_AFTER_VOWEL -contains $id)) { 70.0 } else { 25.0 }
  $ms = Save-Clip $pcm (Join-Path $out $name) $lift $(if ($lift -gt 25.0) { 0.06 } else { 0.0 })
  if (-not $ms) { Write-Output "  $id  (silent - skipped)"; $failed += $id; continue }
  $made += $name
  Write-Output ("  {0,-4} {1,4} ms" -f $id, $ms)
}

# Whole words and the syllables the longest words are split into. These are said as
# ordinary text - they are real bits of speech, not single sounds - and saved in
# audio/words/, where the game looks for them by name.
if ($WordsFile) {
  $listPath = Join-Path $root $WordsFile
  if (-not (Test-Path $listPath)) { throw "No such list: $listPath" }
  # Syllables and whole words are kept apart because the same spelling means different
  # things in each. The "to" of tomato is "toh" and the word "to" is "too"; the "read" of
  # bread rhymes with bed and the word "read" with seed. One folder for both would let a
  # syllable answer for a word, silently and in the wrong voice.
  $bucket = if ($Spoken) { 'spoken' } else { 'words' }
  $wordsOut = Join-Path $root "audio\$bucket"
  New-Item -ItemType Directory -Force $wordsOut | Out-Null

  # A line is either a word to be read as text ("rabbit"), or a syllable with the sounds it
  # is made of ("ap = a p"). The second kind is synthesised from phonemes, as one syllable
  # in one breath - the voice reads a bare "ap" as "A. P.", and stitching the two recorded
  # sounds together sounds stitched, because neither was spoken with the other in mind.
  $ipaOf = @{}
  foreach ($s in $SOUNDS) { $ipaOf[$s[0]] = $s[1] }

  $items = @()
  foreach ($line in Get-Content $listPath) {
    $line = ($line -replace '#.*$', '').Trim().ToLower()    # notes to the reader, not data
    if (-not $line) { continue }
    if ($line -match '^(\S+)\s*=\s*(.+)$') {
      $name = $Matches[1]
      $ids = $Matches[2] -split '\s+'
      $ipa = ''
      $ok = $true
      foreach ($id in $ids) {
        if (-not $ipaOf.ContainsKey($id)) { Write-Output "  $name  unknown sound '$id'"; $ok = $false; break }
        $ipa += $ipaOf[$id]
      }
      if ($ok) { $items += @{ name = $name; ipa = $ipa } }
    } else {
      # A whole phrase is saved under a name made of its letters and nothing else, so
      # that "Order up!" becomes order-up.wav. The game slugs what it is about to say the
      # same way before looking for a recording of it. A single word slugs to itself, so
      # every clip recorded before this existed is still found under the same name.
      $slug = ($line -replace "[^a-z0-9]+", '-').Trim('-')
      if ($slug) { $items += @{ name = $slug; text = $line; ipa = '' } }
    }
  }
  $items = $items | Group-Object { $_.name } | ForEach-Object { $_.Group[0] }
  Write-Output "Words: $($items.Count) from $WordsFile"

  foreach ($item in $items) {
    $w = $item.name
    # a clip that is already there is kept, so a second run only fills what is missing
    if ((Test-Path (Join-Path $wordsOut "$w.$EXT")) -and -not $Force) { continue }
    $said = if ($item.ipa) {
      "<phoneme alphabet='ipa' ph='$(Unescape-Ipa $item.ipa)'>x</phoneme>"
    } else {
      # what is spoken is the line as written; $w is only what the file is called
      [Security.SecurityElement]::Escape($(if ($item.text) { $item.text } else { $w }))
    }
    try {
      $got = Get-Pcm $said 'slow'
    } catch {
      Write-Output "  $w  FAILED: $($_.Exception.Message)"; $failed += $w; continue
    }
    $path = Join-Path $wordsOut "$w.$EXT"
    if ($Mp3) {
      # already encoded; trimming and levelling would mean a decode and a re-encode
      [IO.File]::WriteAllBytes($path, $got)
      Write-Output ("  {0,-10} {1,6:N0} bytes  {2}" -f $w, $got.Length, $(if ($item.ipa) { 'phonemes' } else { 'text' }))
    } else {
      $ms = Save-Clip $got $path
      if (-not $ms) { Write-Output "  $w  (silent - skipped)"; $failed += $w; continue }
      Write-Output ("  {0,-10} {1,4} ms  {2}" -f $w, $ms, $(if ($item.ipa) { 'phonemes' } else { 'text' }))
    }
    $made += "$w.$EXT"
  }

  # both kinds are listed: the blended clips stay PCM, the spoken ones are encoded
  $have = Get-ChildItem $wordsOut -Include *.wav, *.mp3 -Recurse | ForEach-Object { $_.Name } | Sort-Object
  $clipsJs = Join-Path $root 'audio\clips.js'
  $text = [IO.File]::ReadAllText($clipsJs)
  $list = ($have | ForEach-Object { "'$_'" }) -join ', '
  $text = [regex]::Replace($text, "$bucket`: \[[^\]]*\]", "$bucket`: [$list]")
  [IO.File]::WriteAllText($clipsJs, $text)
  Write-Output "Made $($made.Count) word clips; $($have.Count) listed in audio/clips.js."
  if ($failed.Count) { Write-Output "Not made: $($failed -join ', ')" }
  return
}

# A comparison run writes somewhere else and leaves the game's clip list alone.
if ($Tag -or $OutDir -ne 'audio\sounds') {
  Write-Output "Made $($made.Count) clips in $OutDir (clips.js untouched)."
} else {
  # List every sound that now has a clip, in the order the sounds are taught. A fresh
  # recording (id.wav) wins over an older one (id.mp3); a sound with neither is left out
  # and the game speaks it with the device voice.
  $have = @()
  foreach ($s in $SOUNDS) {
    foreach ($ext in 'wav', 'mp3') {
      if (Test-Path (Join-Path $out "$($s[0]).$ext")) { $have += "$($s[0]).$ext"; break }
    }
  }
  $clipsJs = Join-Path $root 'audio\clips.js'
  $text = [IO.File]::ReadAllText($clipsJs)
  $list = ($have | ForEach-Object { "'$_'" }) -join ', '
  $text = [regex]::Replace($text, 'sounds: \[[^\]]*\]', "sounds: [$list]")
  [IO.File]::WriteAllText($clipsJs, $text)
  Write-Output "Made $($made.Count) sounds; $($have.Count) of $($SOUNDS.Count) listed in audio/clips.js."
}
if ($failed.Count) { Write-Output "Not made: $($failed -join ', ')" }
