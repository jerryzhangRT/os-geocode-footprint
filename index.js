import 'dotenv/config'

import fetch from 'node-fetch';

// This request gets the Lat/Lng + TOID for an address
const osGeocodeQuery = async address => {
  const reqParams = new URLSearchParams({
    key: process.env.OPENDATA_API_KEY,
    query: address,
    output_srs: "EPSG:4326",
    minmatch: "0.5",
    dataset: 'DPA'
  });

  const reqURL = `${process.env.OS_PLACES_URL}?${reqParams.toString()}`;

  // GET request
  const res = await fetch(reqURL);
  const json = await res.json();

  // Response contains lots more data, just pull out lat/lng + topography ID for now
  return {
    formattedAddress: json.results?.[0].ADDRESS,
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

  // Response contains lots more data, geometry is what contains coordinates to draw footprint polygon
  return wfsJSON.features[0].geometry.coordinates;
}

try {
  const uk_address = "1 Marshlands, Pencader SA39 9EU, UK";

  // await osPlacesQuery(uk_address);
  const footprint = await osFootprintQuery(uk_address)
  console.log({footprint})
} catch (error) {
  console.log({error});
}