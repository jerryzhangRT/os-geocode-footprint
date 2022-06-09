import 'dotenv/config'

import fetch from 'node-fetch';

const osPlacesQuery = async address => {
  const reqParams = new URLSearchParams({
    key: process.env.OS_API_KEY,
    query: address,
    output_srs: "EPSG:4326",
    minmatch: "0.5",
    dataset: 'DPA'
  });

  const reqURL = `${process.env.OS_PLACES_URL}?${reqParams.toString()}`;

  const res = await fetch(reqURL);
  const json = await res.json();

  console.log(json.results[0].DPA);

  // let xml = '<ogc:Filters>'
  // xml += '<ogc:PropertyIsEqualTo>'
  // xml += '<PropertyName>TOID</ogc:PropertyName>'
  // xml += '<ogc:Literal>' + toid + '</ogc:Literal>'
  // xml += '</ogc:PropertyIsEqualTo>'
  // xml += '</ogc:Filter>'

  const lat = json.results[0].DPA.LAT;
  const lng = json.results[0].DPA.LNG;
  const coord = [lat, lng]

  // Get building footprint based on coordinates
  var xml = '<ogc:Filter>';
  xml += '<ogc:Contains>';
  xml += '<ogc:PropertyName>SHAPE</ogc:PropertyName>';
  xml += '<gml:Point srsName="urn:ogc:def:crs:EPSG::4326">';
  xml += '<gml:coordinates>' + coord.join(',') + '</gml:coordinates>';
  xml += '</gml:Point>';
  xml += '</ogc:Contains>';
  xml += '</ogc:Filter>';

  const wfsParams = {
    key: process.env.OS_API_KEY,
    service: 'WFS',
    request: 'GetFeature',
    version: '2.0.0',
    typeNames: 'Topography_TopographicArea',
    propertyName: 'TOID,DescriptiveGroup,SHAPE',
    outputFormat: 'GEOJSON',
    srsName: 'urn:ogc:def:crs:EPSG::4326',
    filter: xml,
    count: 1
  }

  const encodedParams = Object.keys(wfsParams)
    .map(paramName => `${paramName}=${encodeURI(wfsParams[paramName])}`)
    .join('&')
  
  const wfsURL = `${process.env.OS_FEATURES_URL}?${encodedParams}`;

  const wfsRes = await fetch(wfsURL);
  const wfsJSON = await wfsRes.json()


  console.log(wfsJSON.features[0]);

  // Geometry
  console.log(wfsJSON.features[0].geometry);
}

try {
  const uk_address = "Unit 22, Nursling Industrial Estate, Oriana Way, Southampton SO16 0YU, United Kingdom";
  await osPlacesQuery(uk_address);

} catch (error) {
  console.log({error});
}