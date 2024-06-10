"use strict";

const debug = require('debug')('[Homebridge SoundButton] -  ');
let Accessory, Service, Characteristic, UUIDGen, HAPServer;
const accessories = [];
const amixer = require('./lib/alsa.js');
const { spawn } = require('child_process');

module.exports = (homebridge) => {
  Accessory = homebridge.hap.Accessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  HAPServer = homebridge.hap.HAPServer;
  homebridge.registerPlatform("homebridge-sound-button", "SoundButton", SoundButtonPlatform);
}

class SoundButtonPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.cache_timeout = 10; // seconds
    this.refresh = config['refresh'] || 10; // Update every 10 seconds
    this.debugging = config.debugging || false;
    this.debugPrefix = config.debugPrefix || '~~~~~~!!!!~~~~~~ '
    this.log.prefix = 'Homebridge Sound Button';
    this.alsaDebug = config.enableAlsaOutput || false;
    this.defaultSoundPlayer = config.defaultSoundPlayer || '';
    this.configAccessories = (config.accessories !== undefined && Array.isArray(config.accessories)) ? config.accessories : [];

    if (api) {
      this.api = api;
      this.api.on('didFinishLaunching', () => this.didFinishLaunching());
    }
  }

  didFinishLaunching() {
    this.pdebug('Finished launching, didFinishLaunching called');
    this.loadSoundAccesories(() => {
      this.pdebug('******* Sound Accessories Loaded!');
    });

    if (this.alsaDebug === true) {
      this.alsaMixer = new amixer();
      this.alsaMixer.amixer([], (err, message) => {
        this.pdebug('AlsaMixer amixer');
        if (err) {
          this.pdebug('Error' + err.message);
        }
        if (message) {
          this.pdebug('AlsaMixer defaultDevice');
          this.pdebug(message);
        }
      }); // main alsa query
    }
  }

  loadSoundAccesories(callback) {
    this.pdebug('******* Loading accessories from config');
    const alength = this.configAccessories.length;
    for (let i = 0; i < alength; i++) {
      if (!accessories[this.configAccessories[i].id]) {
        this.log('New Accessory ' + i + ' Adding');
        this.addAccessory(this.configAccessories[i]);
      }
      if (i === (alength - 1)) {
        callback();
      }
    }
  }

  configureAccessory(accessory) {
    const accessoryId = accessory.context.id;
    let found = false;
    const alength = this.configAccessories.length;
    for (let i = 0; i < alength; i++) {
      if (this.configAccessories[i].id === accessory.context.id) {
        this.pdebug('FOUND ACCESSORY: ' + accessoryId + ' Name: ' + accessory.context.name);
        found = true;
        const data = this.configAccessories[i];
      }
    }

    if (found) {
      this.log('******* Updating accessory to new config options: ' +  accessoryId + 'Name: ' + data.name);
      accessory.context.name = data.name;
      accessory.context.id = data.id;
      accessory.context.isPlaying = false;
      accessory.context.soundFile = data.soundFile;
      accessory.context.soundOptions = data.soundOptions || [];
      accessory.context.repeat = data.repeat || 0;
      accessory.context.volume = data.volume || 100;
      accessory.context.loop = data.loop || false;
      accessory.context.soundEnabled = data.soundEnabled || true;

      if (data.soundPlayer !== undefined) {
        accessory.context.soundPlayer = data.soundPlayer;
      } else {
        // Change default sound player to mpg321
        accessory.context.soundPlayer = '/usr/bin/mpg321';
      }

      this.setService(accessory);
      accessories[accessoryId] = accessory;
    } else {
      this.log("******* REMOVE Accessory Missing from Config: " + accessoryId + ' Name: ' + accessory.context.name);
      this.removeAccessory(accessory);
    }
  }

  addAccessory(data) {
    if (!accessories[data.id]) {
      this.log('******* Adding accessory ' + data.name);

      const uuid = UUIDGen.generate(data.id);
      this.pdebug('UUID' + uuid);

      const accessory = new Accessory(data.name, uuid, 8);

      accessory.context.name = data.name;
      accessory.context.id = data.id;
      accessory.context.isPlaying = false;
      accessory.context.soundFile = data.soundFile;
      accessory.context.soundOptions = data.soundOptions || [];
      accessory.context.repeat = data.repeat || 0;
      accessory.context.volume = data.volume || 100;
      accessory.context.loop = data.loop || false;
      accessory.context.soundEnabled = data.soundEnabled || true;

      if (data.soundPlayer !== undefined) {
        accessory.context.soundPlayer = data.soundPlayer;
      } else {
        // Change default sound player to mpg321
        accessory.context.soundPlayer = '/usr/bin/mpg321';
      }

      accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, "Sound Buttons - drumfreak@github")
        .setCharacteristic(Characteristic.Model, "B11")
        .setCharacteristic(Characteristic.SerialNumber, accessory.context.id)
        .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

      accessory.addService(Service.Switch, data.name);

      this.setService(accessory);

      this.api.registerPlatformAccessories("homebridge-sound-button", "SoundButton", [accessory]);
      accessories[data.id] = accessory;
    }
  }

  setPowerState(thisPlug, powerState, callback) {
    let _playerSoundOptions = [];

    if (powerState === true) {
      this.log('******* Playing Sound.... ' + thisPlug.soundFile);

      if (thisPlug.soundOptions.length > 0) {
        _playerSoundOptions = thisPlug.soundOptions;
      }

      if (_playerSoundOptions.indexOf(thisPlug.soundFile) === -1) {
        _playerSoundOptions.push(thisPlug.soundFile);
      }

      let playerSoundPlayer = this.defaultSoundPlayer;

      if (thisPlug.soundPlayer !== undefined && thisPlug.soundPlayer !== '') {
        playerSoundPlayer = thisPlug.soundPlayer;
      } else {
        // Change default sound player to mpg321
        playerSoundPlayer = '/usr/bin/mpg321';
      }

      this.pdebug('Sound Player: ' + playerSoundPlayer);

      thisPlug.isPlaying = true;

      thisPlug.playProcess = spawn(playerSoundPlayer, _playerSoundOptions);

      if (this.debugging) {
        this.pdebug('Player Options: ' + _playerSoundOptions);
        this.pdebug('Player File: ' + thisPlug.soundFile);
        this.pdebug('Player Command: ' + playerSoundPlayer + ' ' +  _playerSoundOptions);
        this.pdebug('******* Launching PID .... ' + thisPlug.playProcess.pid
