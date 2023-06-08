// Dealing with local timezones
// based on this map
// https://upload.wikimedia.org/wikipedia/commons/5/59/World_Time_Zone_Chart_1942.jpg
const getLongitudeTimeZone = (lng) => {
  return `Etc/GMT+${-Math.ceil((lng / 7.5 - 1) / 2)}`.replace("+-", "-");
};

const getVisibleTimezone = (map) => {
  const timeZones = map.queryRenderedFeatures(
    [
      [0, window.innerHeight],
      [window.innerWidth, 0],
    ],
    {
      layers: ["Timezones"],
    }
  );
  // sometimes multiple geojson elements correspond to same timezone
  if (timeZones.length > 0) {
    const initialValue = timeZones[0].properties.TZID;
    const timeZone = timeZones.reduce((prev, cur) => {
      if (cur.properties.TZID === prev) {
        return prev;
      }
      return undefined;
    }, initialValue);
    if (timeZone !== undefined) {
      return timeZone;
    }
  }
};

const getScreenCenterTimeZone = (map) => {
  const centerTimeZone = map.queryRenderedFeatures(
    [window.innerWidth / 2, window.innerHeight / 2],
    {
      layers: ["Timezones"],
    }
  );
  if (centerTimeZone.length === 1) {
    return centerTimeZone.map((timeZone) => timeZone.properties.TZID)[0];
  }
};

const getTimeZone = (map) => {
  let timezone;
  timezone = getVisibleTimezone(map);
  if (
    timezone !== undefined &&
    timezone !== "uninhabited" &&
    timezone !== "Etc/Unknown"
  ) {
    return timezone;
  }
  timezone = getScreenCenterTimeZone(map);
  if (
    timezone !== undefined &&
    timezone !== "uninhabited" &&
    timezone !== "Etc/Unknown"
  ) {
    return timezone;
  }
  const { lng } = map.getCenter();
  return getLongitudeTimeZone(lng);
};

const UTCOffsetByTimeZone = (date = new Date(), timeZone = "UTC") => {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return utcDate.getTime() - tzDate.getTime();
};

/**
 * Ensure vector data is loaded
 * @param {MapboxGLMap} map
 * @returns Promise that resolves when map is loaded
 */
const mapLoaded = (map) => {
  return new Promise((res, rej) => {
    function cb() {
      if (!map.loaded()) {
        return;
      }
      map.off("render", cb);
      res();
    }
    map.on("render", cb);
    cb();
  });
};

// ShadeMap utils
window.SMUtils = {
  getTimeZone,
  mapLoaded,
  UTCOffsetByTimeZone,
};
