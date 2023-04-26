# Large GeoTIFF export

**The demo for this example is available [here](https://ted-piotrowski.github.io/shademap-examples/examples/large-geotiff.html).**

![ShadeMap large GeoTIFF](/images/large-geotiff/large-geotiff.png)

The above sample stitches together several screens worth of ShadeMap data into a single large GeoTIFF file. Many people have requested to export a large geographical area at high zoom level and thats what this example does.

It takes a large geographic area and then breaks it down into screen sized rectangles. It renders ShadeMap data for each screen sized block and then stitches them together into a single GeoTIFF. You can view an example output for Washington DC on [this Felt Map](https://felt.com/map/Washington-DC-at-6-39PM-EST-c08ZJBpHRAu9BvDGYxZm38C?lat=38.903328&lon=-77.06368&zoom=11.86)

## Limitations

Due to the fact that Firefox cannot generate a file larger than 32MB, it's best to use Chrome browser. Even with Chrome, the GeoTIFF is limited to 2^26 pixels because that's the largest array size that can be instantiated in the Chrome browser. The script throws an error if the geographical bounds exceed this limit and you will need to reduce their size to produce a GeoTIFF file.