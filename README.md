
Homebridge Bluetooth Sound Buttons is a plugin for Homebridge, allowing you to control sound playback through Bluetooth-enabled buttons. It utilizes Alsa speakers, making it suitable for Raspberry Pi and Linux systems. With this plugin, you can integrate your Bluetooth sound buttons into your smart home ecosystem, enabling convenient control over audio playback.

**Example Configuration:**
```json
{
  "platform": "SoundButton",
  "accessories": [
    {
      "id": "button1",
      "name": "Sound Button 1",
      "soundFile": "/path/to/sound1.mp3",
      "repeat": 2,
      "volume": 50,
      "loop": false,
      "soundEnabled": true
    },
    {
      "id": "button2",
      "name": "Sound Button 2",
      "soundFile": "/path/to/sound2.mp3",
      "repeat": 1,
      "volume": 80,
      "loop": true,
      "soundEnabled": true
    }
  ]
}
```

In this configuration:

- `id`: Unique identifier for the sound button.
- `name`: Name of the sound button accessory.
- `soundFile`: Path to the sound file to be played.
- `repeat`: Number of times the sound should be repeated.
- `volume`: Volume level for playback (0-100).
- `loop`: Whether the sound should be played in a loop.
- `soundEnabled`: Whether the sound playback is enabled for this button.

You can add multiple sound buttons by specifying them in the `accessories` array. Adjust the parameters according to your preferences and the sound files you want to play.

---
