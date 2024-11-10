import requests
import pandas as pd
from datetime import date

def fetch_real_time_BikeData():
    
    url = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"
    response = requests.get(url)

    df = pd.DataFrame(response.json())
    valid = df.query(f'infoDate >= "{date.today().strftime('%Y-%m-%d')}"')
    valid["sna"] = valid["sna"].str.replace("YouBike2.0_","")

    to_return = valid[["sna", 'latitude', 'longitude','available_rent_bikes','available_return_bikes','total']]

    return to_return.to_json(orient="records")