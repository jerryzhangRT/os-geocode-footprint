import 'dotenv/config'

import fetch from 'node-fetch';

// This request gets the Lat/Lng + TOID for an address
const osGeocodeQuery = async address => {
  const reqParams = new URLSearchParams({
    key: process.env.OPENDATA_API_KEY,
    query: address,
    output_srs: "EPSG:4326",
    // minmatch: "",
    dataset: 'DPA'
  });

  const reqURL = `${process.env.OS_PLACES_URL}?${reqParams.toString()}`;

  // GET request
  const res = await fetch(reqURL);
  const json = await res.json();
  console.log(json.results[0])
  // console.log(json.results[0]);
  // Response contains lots more data, just pull out lat/lng + topography ID for now
  return {
    formattedAddress: json.results?.[0].DPA.ADDRESS,
    lat: json.results?.[0].DPA.LAT,
    lng: json.results?.[0].DPA.LNG,
    toid: json.results?.[0].DPA.TOPOGRAPHY_LAYER_TOID
  }
}

const osFootprintQuery = async address => {
  // First get toid for address to use in later query
  const { lat, lng, toid } = await osGeocodeQuery(address);
  // const coord = [ lat, lng ];
  // console.log({ lat, lng, toid })

  // Get building footprint based on coords
  // var xml = '<ogc:Filter>';
  // xml += '<ogc:Contains>';
  // xml += '<ogc:PropertyName>SHAPE</ogc:PropertyName>';
  // xml += '<gml:Point srsName="urn:ogc:def:crs:EPSG::4326">';
  // xml += '<gml:coordinates>' + coord.join(',') + '</gml:coordinates>';
  // xml += '</gml:Point>';
  // xml += '</ogc:Contains>';
  // xml += '</ogc:Filter>';

  // Get building footprint based on TOID (Topography Id)
  var xml = '<ogc:Filter>';
  xml += '<ogc:PropertyIsEqualTo>';
  xml += '<ogc:PropertyName>TOID</ogc:PropertyName>';
  xml += '<ogc:Literal>' + toid + '</ogc:Literal>';
  xml += '</ogc:PropertyIsEqualTo>';
  xml += '</ogc:Filter>';

  const wfsParams = {
    key: process.env.OPENDATA_API_KEY,
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

  // GET request 
  const wfsRes = await fetch(wfsURL);
  const wfsJSON = await wfsRes.json()
  console.log(wfsJSON.features[0]);
  // Response contains lots more data, geometry is what contains coordinates to draw footprint polygon
  return wfsJSON.features[0].geometry;
}

const osFootprintBBox = async address => {
  const { lat, lng } = await osGeocodeQuery(address);

  // create bounding box of ~300m around most lat/lng of most likely result
  const ne = { lat: lat + 0.0015, lng: lng - 0.0015 }
  const sw = { lat: lat - 0.0015, lng: lng + 0.0015 }

  const coords = `${sw.lat},${sw.lng} ${ne.lat},${ne.lng}`

  // var xml = '<ogc:Filter>';
  // xml += '<ogc:BBOX>';
  // xml += '<ogc:PropertyName>SHAPE</ogc:PropertyName>';
  // xml += '<gml:Box srsName="urn:ogc:def:crs:EPSG::4326">';
  // xml += '<gml:coordinates>' + coords + '</gml:coordinates>';
  // xml += '</gml:Box>';
  // xml += '</ogc:BBOX>';
  // xml += '</ogc:Filter>';

  var xml = '<ogc:Filter>';
  xml += '<ogc:And>';
  xml += '<ogc:BBOX>';
  xml += '<ogc:PropertyName>SHAPE</ogc:PropertyName>';
  xml += '<gml:Box srsName="urn:ogc:def:crs:EPSG::4326">';
  xml += '<gml:coordinates>' + coords + '</gml:coordinates>';
  xml += '</gml:Box>';
  xml += '</ogc:BBOX>';
  xml += '<ogc:PropertyIsEqualTo>';
  xml += '<ogc:PropertyName>DescriptiveGroup</ogc:PropertyName>';
  xml += '<ogc:Literal>Building</ogc:Literal>';
  xml += '</ogc:PropertyIsEqualTo>';
  xml += '</ogc:And>';
  xml += '</ogc:Filter>';

  var wfsParams = {
    key: process.env.OPENDATA_API_KEY,
    service: 'WFS',
    request: 'GetFeature',
    version: '2.0.0',
    typeNames: 'Topography_TopographicArea',
    propertyName: 'TOID,DescriptiveGroup,SHAPE',
    outputFormat: 'GEOJSON',
    srsName: 'urn:ogc:def:crs:EPSG::4326',
    filter: xml
  };

  const encodedParams = Object.keys(wfsParams)
    .map(paramName => `${paramName}=${encodeURI(wfsParams[paramName])}`)
    .join('&')

  const wfsURL = `${process.env.OS_FEATURES_URL}?${encodedParams}`;

  const wfsRes = await fetch(wfsURL);
  const wfsJSON = await wfsRes.json()
  console.log(wfsJSON);
  console.log(wfsJSON.features);
  // Response contains lots more data, geometry is what contains coordinates to draw footprint polygon
  // return wfsJSON.features[0].geometry;
  return wfsJSON.features;
}

try {
  const uk_address = "95 Pittodrie Pl, Aberdeen AB24 5RA, UK";

  // const geocode = await osGeocodeQuery(uk_address);
  // console.log({geocode});
  // const footprint = await osFootprintQuery(uk_address)
  // console.log(JSON.stringify(footprint))

  const footprints = await osFootprintBBox(uk_address);
  // clg
} catch (error) {
  console.log({error});
}