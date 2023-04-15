In this example I will show how to use ShadeMap to calculate how much direct sunlight a vehicle, such as a bus, receives while traveling along a route. I will use Berlin bus route M44 represented as a GeoJSON LineString geometry I obtained [here](https://umap.openstreetmap.fr/en/datalayer/2737191/).

The bus travels 1.41 km over the course of 10 minutes. To simplify this exercise we will assume the bus has a constant velocity. For a more accurate calculation, real-time bus location data represented by [GTFS](https://gtfs.org/) could be used instead.

First we choose some number of points to check along the route, let's say 500. The points will be at equal distances from each other and the distance between any two points will the the length of the route divided by the number of points. On our route, the distance between points will be `1.41km / 500 = 2.8m`.

```
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

Next we need to find on which map tiles the points are located. Map tiles contain the building data we need to calculate building shadows, including each building's footprint and height. Map tiles at low zoom levels do not contain building data. We specifically need to use map tiles at zoom level 16 or above.

More concretely, we will load the map at zoom level 16, place as many points as will fit on the screen and calculate their sun exposure. Next, we will pan the map the accomodate the additional points and repeat the process until the sun exposure for all points has been calculated.

To do this, we must split our 500 points into groups that are small enough to fit on a single screen. We will start with the first point and add additional points as long as they don't overflow the pixel dimensions of the screen.

```
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

Below is an example of how our route is split across three groups to fit on a screen with iPhone dimensions. The images show all three groups at a low zoom level and then each individual group with buildings at zoom level 16:

![all-groups](/images/route/all-groups.png)

![group1](/images/route/groups1.png)

![group2](/images/route/groups2.png)

![group3](/images/route/groups3.png)