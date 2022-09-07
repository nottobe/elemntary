class ElectronApi {
  listDevices() {
    return new Promise((resolve, reject) => {
      window.electronAPI.listDevices();

      window.electronAPI.onDeviceList((_event, value) => {
        resolve(value);
      });
    });
  }

  getDevice(deviceId) {
    return this.listDevices().then((devices) => {
      let filtered = devices.filter((d) => d.id == deviceId);

      if (filtered.length == 1) {
        return filtered[0];
      }

      return null;
    });
  }

  listDeviceFeatures(deviceId) {
    return new Promise((resolve, reject) => {
      window.electronAPI.getFeatures(deviceId);

      window.electronAPI.onFeatureList((_event, features) => {
        resolve(features);
      });
    });
  }

  saveDeviceFeatures(deviceId, features) {
    return new Promise((resolve, reject) => {
      window.electronAPI.saveFeatures(deviceId, features);

      window.electronAPI.onFeaturesSaved((_event) => {
        resolve();
      });
    });
  }

  selectFile() {
    return new Promise((resolve, reject) => {
      window.electronAPI.selectFile();

      window.electronAPI.onFileSelected((_event, path) => {
        resolve(path);
      });
    });
  }

  uploadMap(deviceId, path) {
    return new Promise((resolve, reject) => {
      window.electronAPI.uploadMap(deviceId, path);

      window.electronAPI.onMapUploaded((_event, err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  takeScreenshot(deviceId) {
    return new Promise((resolve, reject) => {
      window.electronAPI.takeScreenshot(deviceId);

      window.electronAPI.onScreenshot((_event, image) => {
        resolve(image);
      });
    });
  }

  loadApkInfo(deviceId) {
    return new Promise((resolve, reject) => {
      window.electronAPI.getApkInfo(deviceId);

      window.electronAPI.onApkInfo((_event, info) => {
        resolve(info);
      });
    });
  }
}

module.exports = ElectronApi;
