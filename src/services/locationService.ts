// src/services/locationService.ts
import axios from "axios";

export const getLocationFromIP = async (ipAddress: string) => {
  try {
    const response = await axios.get(
      `http://api.ipstack.com/${ipAddress}?access_key=${process.env.IPSTACK_API_KEY}`
    );

    const { city, region_name, country_name } = response.data;
console.log(response.data)
    return `${city}, ${region_name}, ${country_name}`;
  } catch (error) {
    console.error("Error fetching location:", error);
    
    return "Unknown Location";
  }
};
