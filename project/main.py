from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
import requests
import pandas as pd
from datetime import date

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent

@app.get("/station_data")
def get_station_data():
    url = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"
    response = requests.get(url)

    df = pd.DataFrame(response.json())
    valid = df.query(f'infoDate >= "{date.today().strftime('%Y-%m-%d')}"')
    valid["sna"] = valid["sna"].str.replace("YouBike2.0_","")
    valid["sarea"] = valid["sarea"].str.replace("臺大公館校區","NTU校區")

    to_return = valid[["sna",'sarea', 'latitude', 'longitude','available_rent_bikes','available_return_bikes','total','infoTime']]

    return to_return.to_dict(orient="records")

# 路由設定
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

@app.get("/{file_name}", response_class=HTMLResponse)
async def serve_html(file_name: str):
    """Serve static HTML files dynamically based on the requested file name."""
    file_path = BASE_DIR / f"static/{file_name}.html"
    if file_path.exists():
        with file_path.open("r", encoding="utf-8") as file:
            return file.read()
    return HTMLResponse(status_code=404, content="File not found.")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve home.html when accessing the root path."""
    home_path = BASE_DIR / "static/index.html"
    if home_path.exists():
        with home_path.open("r", encoding="utf-8") as file:
            return file.read()
    return HTMLResponse(status_code=404, content="Home page not found.")