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
  [switch]$Force             # remake word clips that are already there
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

$RATE = 48000      # fricatives like s, f and th live at 5-10 kHz, so ask for the full band
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
    'X-Microsoft-OutputFormat'  = 'riff-48khz-16bit-mono-pcm'
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

# Trims the silence either side, brings the clip to the same loudness as the others and
# saves it. Returns how long it ended up, or 0 if the voice sent nothing but silence.
function Save-Clip([int[]]$pcm, $path) {
  # where the sound is: first and last sample above a whisper
  $first = -1; $last = -1
  for ($k = 0; $k -lt $pcm.Length; $k++) { if ([Math]::Abs($pcm[$k]) -gt 60) { if ($first -lt 0) { $first = $k }; $last = $k } }
  if ($first -lt 0) { return 0 }

  $start = [Math]::Max(0, $first - [int]($RATE * 0.015))
  $end = [Math]::Min($pcm.Length - 1, $last + [int]($RATE * 0.03))
  $clip = $pcm[$start..$end]

  # same loudness for every sound: quiet ones like f and th are lifted, within reason
  $peak = 1; foreach ($v in $clip) { if ([Math]::Abs($v) -gt $peak) { $peak = [Math]::Abs($v) } }
  $gain = [Math]::Min(26000.0 / $peak, 25.0)
  $fadeIn = [int]($RATE * 0.003); $fadeOut = [int]($RATE * 0.015)
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

  try {
    $pcm = Get-Pcm "<phoneme alphabet='ipa' ph='$(Unescape-Ipa $s[1])'>x</phoneme>" $s[2]
  } catch {
    Write-Output "  $id  FAILED: $($_.Exception.Message)"; $failed += $id; continue
  }

  $name = if ($Tag) { "$Tag-$id.wav" } else { "$id.wav" }
  $ms = Save-Clip $pcm (Join-Path $out $name)
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
  $wordsOut = Join-Path $root 'audio\words'
  New-Item -ItemType Directory -Force $wordsOut | Out-Null

  $items = Get-Content $listPath | ForEach-Object { $_.Trim().ToLower() } |
    Where-Object { $_ -and -not $_.StartsWith('#') } | Select-Object -Unique
  Write-Output "Words: $($items.Count) from $WordsFile"

  foreach ($w in $items) {
    # a clip that is already there is kept, so a second run only fills what is missing
    if ((Test-Path (Join-Path $wordsOut "$w.wav")) -and -not $Force) { continue }
    try {
      $pcm = Get-Pcm ([Security.SecurityElement]::Escape($w)) 'slow'
    } catch {
      Write-Output "  $w  FAILED: $($_.Exception.Message)"; $failed += $w; continue
    }
    $ms = Save-Clip $pcm (Join-Path $wordsOut "$w.wav")
    if (-not $ms) { Write-Output "  $w  (silent - skipped)"; $failed += $w; continue }
    $made += "$w.wav"
    Write-Output ("  {0,-10} {1,4} ms" -f $w, $ms)
  }

  $have = Get-ChildItem $wordsOut -Filter *.wav | ForEach-Object { $_.Name }
  $clipsJs = Join-Path $root 'audio\clips.js'
  $text = [IO.File]::ReadAllText($clipsJs)
  $list = ($have | ForEach-Object { "'$_'" }) -join ', '
  $text = [regex]::Replace($text, 'words: \[[^\]]*\]', "words: [$list]")
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
