# Direct sunlight along a route

**The demo for this example is available [here](https://ted-piotrowski.github.io/shademap-examples/examples/route.html).**

In this example I will show how to use ShadeMap to calculate how much direct sunlight a vehicle, such as a bus, receives while traveling along a route. I will use Berlin bus route 101 represented as a GeoJSON LineString geometry I obtained [here](https://umap.openstreetmap.fr/en/datalayer/2737191/).

The bus travels 8.5km over the course of 20 minutes. To simplify this exercise we will assume the bus has a constant velocity. For a more accurate calculation, real-time bus location data represented by [GTFS](https://gtfs.org/) could be used instead.

First we choose some number of discrete points to check along the route, let's say 500. The points will be at equal distances from each other and the distance between any two points will be the length of the route divided by the number of points. On our route, the distance between points will be `8.5km / 500 = ~17m`.

```javascript
const numPoints = 500;
const busRoute = // LineString
const length = turf.length(busRoute);
const distanceBetweenPoints = length / numPoints;
const pointLocations = [];
for (let i = 0; i < numPoints; i++) {
    const pointLocation = turf.along(busRoute, distanceBetweenPoints * i);
    pointLocations.push(pointLocation)
}
```

Next we need to find on which map tiles the points are located. Map tiles contain the building data we need to calculate building shadows, including each building's footprint and height. Map tiles at low zoom levels do not contain building data. We specifically need to use Mapbox's map tiles at zoom level 15 or above.

More concretely, we will load the map at zoom level 15, place as many points as will fit on the screen and calculate their sun exposure. Next, we will pan the map the accomodate the additional points and repeat the process until the sun exposure for all points has been calculated.

To do this, we must split our 500 points into groups that are small enough to fit on a single screen. We will start with the first point and add additional points as long as they don't overflow the pixel dimensions of the screen.

```javascript
// to keep points from edge of screen, ensure all points
// in a group lie within the center 80% of the screen
const viewportWidth = window.innerWidth * .8;
const viewportHeight = window.innerHeight * .8;

const screenGroups = [];

while (pointLocations.length > 0) {
    const group = [pointLocations.shift()];
    let groupPixelWidth = 0;
    let groupPixelHeight = 0;
    while (pointLocations.length > 0 && groupPixelWidth < viewportWidth && groupPixelHeight < viewportHeight) {
        group.push(pointLocations.shift());
        const groupPoints = turf.lineString(group);
        const [minLng, minLat, maxLng, maxLat] = turf.bbox(groupPoints);
        const [minX, minY] = unproject([minLng, minLat], BUILDING_ZOOM);
        const [maxX, maxY] = unproject([maxLng, maxLat], BUILDING_ZOOM);
        groupPixelWidth = maxX - minX;
        groupPixelHeight = minY - maxY; // pixel value increases from top to bottom while lat increases from bottom to top so reverse minY/maxY
    }
    screenGroups.push(group);
}
```

Below is an example of how our route is split into groups that fit the screen of an iPhone at zoom level 15. The first image shows the extent of each group at a low zoom level and the second image shows one of the groups at the required zoom level 15 with building shadow data present.

| All groups | One group |
| --- | --- |
| ![all-groups](/images/route/all-groups.png) | ![one-group](/images/route/one-group.png) |

Now let us initialize the Mapbox map and the ShadeMap library. The ShadeMap library will use [Amazon's OpenData terrain tiles](https://registry.opendata.aws/terrain-tiles/) and buildings data from Mapbox's terrain tiles via `map.querySourceFeatures` API.

```javascript
mapboxgl.accessToken = // PLEASE USE YOUR OWN API KEY. API KEY IS FOR DEMO PURPOSES ONLY.
var map = window.map = new mapboxgl.Map({
    container: 'map',
    zoom: 15,
    center: screenGroups[0][0],
    style: 'mapbox://styles/mapbox/streets-v11',
    hash: true
});

map.on('load', () => {
    const shadeMap = new ShadeMap({
        // PLEASE USE YOUR OWN API KEY. API KEY IS FOR DEMO PURPOSES ONLY. https://shademap.app/about
        apiKey: 
        date: new Date(1681493800745),
        terrainSource: {
            maxZoom: 15,
            tileSize: 256,
            getSourceUrl: ({ x, y, z }) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
            getElevation: ({ r, g, b, a }) => (r * 256 + g + b / 256) - 32768,
        },
        getFeatures: async () => {
            await mapLoaded(map);
            const buildingData = map.querySourceFeatures('composite', { sourceLayer: 'building' }).filter((feature) => {
                return feature.properties && feature.properties.underground !== "true" && (feature.properties.height || feature.properties.render_height)
            });
            return buildingData;
        },
    }).addTo(map);
})
```

And finally, load the map and ShadeMap data for one group at a time and then compute the direct exposure for all the points of the group for the dates in the dates array. The return value is a bitmap array. Each 4 byte rgba pixel of the bitmap contains either the sunlight or shade color value depending on if the corresponding location at the corresponding time is in the sun or shade. 

Each column of the bitmap corresponds to a location and each row of the bitmap corresponds to a Date value in the dates array. The bitmap value for pixel (0, height - 1) is the first location in the group at time given by the first Date in the dates array, while the bitmap value for pixel (width - 1, 0) is the last location in the group at time given by the lat date in the dates array.

In this example, the dates array only contains a single date, so the bitmap will be 500 pixels wide (one pixel for each location along the route) and 1 pixel high (corresponsing to a single date)

```javascript
for (let i = 0; i < screenGroups.length; i++) {
    const group = screenGroups[i];
    const groupCenter = turf.center(turf.points(group));

    const shadeMapLoaded = new Promise((res, rej) => {
        shadeMap.on('idle', res);
    });
    map.setCenter(groupCenter.geometry.coordinates).setZoom(BUILDING_ZOOM);
    const mapboxLoaded = mapLoaded(map);

    const locations = groupCenter.geometry.coordinates.map(coord => {
        return { lng: coord[0], lat: coord[1] };
    })
    const dates = [new Date(1681493800745)];

    await Promise.all([mapboxLoaded, shadeMapLoaded]);

    const output = shadeMap._generateShadeProfile({
        locations,
        dates,
        sunColor: [255, 255, 255, 255],
        shadeColor: [0, 0, 0, 255]
    });

    // output is a (r,g,b,a) bitmap containing sunColor or shadeColor
    // output dimensions are (numPoints X dates.length X 4 bytes per pixel)
    // process the data as you see fit
    for (let i = 0; i < output.length / 4; i++) {
        const marker = new mapboxgl.Marker({
            color: output[i * 4] === 0 ? '#000' : '#fff'
        });
        marker.setLngLat(group[i]).addTo(map);
    }
};
```

In this example, I place a map marker at every discrete point along the route and color it black if it is in the shade and white if it is in the sun.

![markers](/images/route/markers.png)
