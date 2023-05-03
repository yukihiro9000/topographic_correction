// ユーザーの方が変更する箇所 ここから
var path = 108;
var row = 34;
var startDate = "2020-01-01";
var endDate = "2020-12-31";
var ndviThreshold = 0.35;
var country = 'Japan';
var mapCenterLongitude = 138
var mapCenterLatitude = 37.5
// ユーザーの方が変更する箇所 ここまで

function test(value) {
  console.log(value);
  Map.addLayer(value); 
}

function radians(img) {
  return img.toFloat().multiply(Math.PI).divide(180);
}

function radNumber(number) {
  return ee.Number(Math.PI).divide(180).multiply(number);
}

function cosGamma(azimuth, zenith, slope, aspect) {
  return aspect.subtract(azimuth).cos()
    .multiply(slope.sin())
    .multiply(zenith.sin())
    .add(slope.cos().multiply(zenith.cos()))
    .rename('SOLAR_INCIDENT_ANGLE')
}

Map.setCenter(mapCenterLongitude, mapCenterLatitude, 7);

var countryPolygon = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
    .filter(ee.Filter.eq('country_na', country));
var dem = ee.Image("USGS/SRTMGL1_003");
var useBand = ["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"];
var surfaceReflectance = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate(startDate, endDate)
  .filter(ee.Filter.eq('WRS_PATH', path))
  .filter(ee.Filter.eq('WRS_ROW', row))
  .select(useBand)
  .sort("CLOUD_COVER")
  .first();

var surfaceReflectanceClip = surfaceReflectance.clip(countryPolygon);

var red = surfaceReflectanceClip.select('SR_B4');
var nir = surfaceReflectanceClip.select('SR_B5');
var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');

var azimuth = surfaceReflectance.get("SUN_AZIMUTH");
var elevation = surfaceReflectance.get("SUN_ELEVATION")
var zenith = ee.Number(90).subtract(elevation);
var azimuthRadian = radNumber(azimuth);
var zenithRadian = radNumber(zenith);
var cosZenith = zenithRadian.cos();

var demClip = dem.clip(countryPolygon)
var aspect = radians(ee.Terrain.aspect(demClip));
var slope = radians(ee.Terrain.slope(demClip));

var cosi = cosGamma(azimuthRadian, zenithRadian, slope, aspect);

surfaceReflectance = surfaceReflectance.addBands(ndvi);
surfaceReflectance = surfaceReflectance.addBands(slope);
surfaceReflectance = surfaceReflectance.addBands(cosi);

var forLinearRegression = surfaceReflectance.select("NDVI").gt(ndviThreshold)
                          .and(surfaceReflectance.select("slope").gt(0.0872));
var areaMasked = forLinearRegression.updateMask(forLinearRegression);

var maskedImage = surfaceReflectance.clip(areaMasked.reduceToVectors({
  scale: 250,
  bestEffort: true,
  geometry: countryPolygon
}));

function linearRegression(bandname) {
  var regressionLine = maskedImage.select("SOLAR_INCIDENT_ANGLE", bandname).reduceRegion({
    reducer: ee.Reducer.linearFit(), 
    geometry: ee.Geometry(surfaceReflectance.geometry().buffer(-3000)), 
    scale: 250,
    maxPixels: 1000000000
  });

  var scale = ee.Number(regressionLine.get('scale'));
  var offset = ee.Number(regressionLine.get('offset'));
  var empiricalParameter = offset.divide(scale);
  var output = surfaceReflectance.expression(
    "((surfaceReflectance * (cosZenith * cosSlope + cvalue)) / (ic + cvalue))", {
    'surfaceReflectance': surfaceReflectance.select(bandname),
    'ic': surfaceReflectance.select('SOLAR_INCIDENT_ANGLE'),
    'cosSlope': surfaceReflectance.select('slope').cos(),
    'cosZenith': cosZenith,
    'cvalue': empiricalParameter
  });

  return output;
}

var props = surfaceReflectance.toDictionary();

var vizParams = {
  bands: ['SR_B5', 'SR_B4', 'SR_B3'], 
  min: 7000,
  max: 32000,
};

var correctedImage = ee.Image(ee.Image(useBand.map(linearRegression)).setMulti(props));

Map.addLayer(surfaceReflectanceClip, vizParams, "補正前の画像");
Map.addLayer(correctedImage, vizParams, "補正後の画像");

// Export.image.toDrive({
//   image: correctedImage,
//   description: 'correctedImage',
//   scale: 30,
//   region: geometry
// });
