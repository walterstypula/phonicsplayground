# Makes the 44 phonics sound clips in audio/sounds/ with the speech engine built into
# Windows, then lists them in audio/clips.js. Runs offline; nothing is sent anywhere.
#
#   powershell -ExecutionPolicy Bypass -File tools/make-sounds.ps1
#   powershell -ExecutionPolicy Bypass -File tools/make-sounds.ps1 -Voice "Microsoft David Desktop"
#
# A text-to-speech voice given ordinary text cannot say a sound on its own ("s" comes out
# as "ess" or "suh"). Given the sound as a phonetic symbol instead, it says just that
# sound. Held sounds (s, m, ee ...) are spoken slowly so they last about half a second;
# quick sounds (t, p, k ...) at normal speed so they stay crisp. Each clip is trimmed and
# brought to the same loudness. Human recordings can replace any of these files later.
param([string]$Voice = '')

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'audio\sounds'
New-Item -ItemType Directory -Force $out | Out-Null

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
# the engine always adds a vowel after "h"; keep only the breath before the gap
$FIRST_PART_ONLY = @('h')

$RATE = 22050
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo($RATE,
  [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

function Pick-Voice($synth) {
  $names = $synth.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo }
  if ($Voice) { return $Voice }
  $us = $names | Where-Object { $_.Culture.Name -eq 'en-US' }
  $female = $us | Where-Object { $_.Gender -eq 'Female' } | Select-Object -First 1
  if ($female) { return $female.Name }
  if ($us) { return ($us | Select-Object -First 1).Name }
  throw 'No American English voice is installed.'
}

function Speak-Pcm($ipa, $speed, $voiceName) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($voiceName)
  $ms = New-Object System.IO.MemoryStream
  $synth.SetOutputToAudioStream($ms, $fmt)
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    "<prosody rate='$speed'><phoneme alphabet='ipa' ph='$ipa'>x</phoneme></prosody></speak>"
  $synth.SpeakSsml($ssml)
  $synth.Dispose()
  $bytes = $ms.ToArray()
  $pcm = New-Object 'int[]' ($bytes.Length / 2)
  for ($k = 0; $k -lt $pcm.Length; $k++) { $pcm[$k] = [BitConverter]::ToInt16($bytes, 2 * $k) }
  return ,$pcm
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

$probe = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voiceName = Pick-Voice $probe
$probe.Dispose()
Write-Output "Voice: $voiceName"

$made = @()
foreach ($s in $SOUNDS) {
  # a human recording (sounds/<id>.mp3) wins: keep it and do not make this one
  if (Test-Path (Join-Path $out ($s[0] + '.mp3'))) { $made += $s[0] + '.mp3'; Write-Output "  $($s[0])  (recording kept)"; continue }
  $id = $s[0]; $ipa =[regex]::Replace($s[1], "<([0-9a-f]{4})>", { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) }); $speed = $s[2]
  $pcm = Speak-Pcm $ipa $speed $voiceName

  # where the sound is: first and last sample above a whisper
  $first = -1; $last = -1
  for ($k = 0; $k -lt $pcm.Length; $k++) { if ([Math]::Abs($pcm[$k]) -gt 60) { if ($first -lt 0) { $first = $k }; $last = $k } }
  if ($first -lt 0) { Write-Output "  $id  (silent - skipped)"; continue }

  $maxGain = 25.0
  if ($FIRST_PART_ONLY -contains $id) {
    # A breath is noisy (the wave crosses zero often); the vowel after it is smooth.
    # Stop 10 ms before the first smooth, audible stretch.
    $frame = [int]($RATE * 0.01)
    for ($f = $first; $f + $frame -le $pcm.Length; $f += $frame) {
      $e = 0.0; $z = 0
      for ($k = 1; $k -lt $frame; $k++) {
        $e += [double]$pcm[$f + $k] * $pcm[$f + $k]
        if (($pcm[$f + $k] -ge 0) -ne ($pcm[$f + $k - 1] -ge 0)) { $z++ }
      }
      if ([Math]::Sqrt($e / $frame) -gt 100 -and $z -lt 20) { $last = [Math]::Max($first + $frame, $f - $frame); break }
    }
    $maxGain = 80.0
  }

  $start = [Math]::Max(0, $first - [int]($RATE * 0.015))
  $pad = if ($FIRST_PART_ONLY -contains $id) { 0 } else { [int]($RATE * 0.03) }
  $end = [Math]::Min($pcm.Length - 1, $last + $pad)
  $clip = $pcm[$start..$end]

  # same loudness for every sound: quiet ones like f and th are lifted, within reason
  $peak = 1; foreach ($v in $clip) { if ([Math]::Abs($v) -gt $peak) { $peak = [Math]::Abs($v) } }
  $gain = [Math]::Min(20000.0 / $peak, $maxGain)
  $fadeIn = [int]($RATE * 0.003); $fadeOut = [int]($RATE * 0.015)
  for ($k = 0; $k -lt $clip.Length; $k++) {
    $g = $gain
    if ($k -lt $fadeIn) { $g *= $k / $fadeIn }
    if ($k -gt $clip.Length - 1 - $fadeOut) { $g *= ($clip.Length - 1 - $k) / $fadeOut }
    $clip[$k] = [int][Math]::Max(-32767, [Math]::Min(32767, [Math]::Round($clip[$k] * $g)))
  }

  Write-Wav (Join-Path $out ($id + '.wav')) $clip
  $made += $id + '.wav'
  Write-Output ("  {0,-4} {1,4} ms" -f $id, [int]($clip.Length * 1000 / $RATE))
}

# list the clips in audio/clips.js, leaving the list of words alone
$clipsJs = Join-Path $root 'audio\clips.js'
$text = [IO.File]::ReadAllText($clipsJs)
$list = ($made | ForEach-Object { "'$_'" }) -join ', '
$text = [regex]::Replace($text, 'sounds: \[[^\]]*\]', "sounds: [$list]")
[IO.File]::WriteAllText($clipsJs, $text)
Write-Output "Made $($made.Count) sounds; audio/clips.js updated."
