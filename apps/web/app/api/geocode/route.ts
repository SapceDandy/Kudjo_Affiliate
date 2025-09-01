import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    // Use OpenStreetMap Nominatim API for geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Kudjo-Affiliate-Platform/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const data: NominatimResult[] = await response.json();
    
    // Filter for business-appropriate addresses (buildings, shops, etc.)
    const businessResults = data.filter(result => {
      const validTypes = ['building', 'shop', 'office', 'commercial', 'retail', 'restaurant', 'cafe'];
      return validTypes.includes(result.type) || 
             validTypes.includes(result.class) ||
             result.address?.house_number; // Has street number
    });

    // Transform to our format
    const results = businessResults.map(result => ({
      place_id: result.place_id.toString(),
      formatted_address: result.display_name,
      name: result.address?.road || result.display_name.split(',')[0],
      geometry: {
        location: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        }
      },
      address_components: [
        ...(result.address?.house_number ? [{
          long_name: result.address.house_number,
          short_name: result.address.house_number,
          types: ['street_number']
        }] : []),
        ...(result.address?.road ? [{
          long_name: result.address.road,
          short_name: result.address.road,
          types: ['route']
        }] : []),
        ...(result.address?.city ? [{
          long_name: result.address.city,
          short_name: result.address.city,
          types: ['locality']
        }] : []),
        ...(result.address?.state ? [{
          long_name: result.address.state,
          short_name: result.address.state,
          types: ['administrative_area_level_1']
        }] : []),
        ...(result.address?.country ? [{
          long_name: result.address.country,
          short_name: result.address.country_code?.toUpperCase() || result.address.country,
          types: ['country']
        }] : []),
        ...(result.address?.postcode ? [{
          long_name: result.address.postcode,
          short_name: result.address.postcode,
          types: ['postal_code']
        }] : [])
      ]
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address suggestions' },
      { status: 500 }
    );
  }
}
