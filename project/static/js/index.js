let map; // 定義全局變量來保存地圖實例

function initializeMap() {
    // 設定 Mapbox 的 API token
    mapboxgl.accessToken = 'pk.eyJ1Ijoic2hpYm55IiwiYSI6ImNrcWtjMDg0NjA0anQyb3RnZnl0cDJkYmYifQ.hqyJUg0ZRzAZbcJwkfs0bQ';

    // 初始化地圖（只執行一次）
    map = new mapboxgl.Map({
        container: 'renderSection', // 指定地圖容器 ID
        style: 'mapbox://styles/mapbox/dark-v11', // 地圖樣式
        center: [121.5654, 25.0330], // 台北市中心
        zoom: 12
    });

    // 地圖載入完成後添加腳踏車站點
    map.on('load', () => {
        addBikeStations(map); // 只加載一次標記
    });
}

function updateMapView(section) {
    document.getElementById("renderSection").style.display = "block";
    document.getElementById("chart").style.display = "none";
    // 根據 section 值更新視野
    switch (section) {
        case 'distribution':
            map.flyTo({
                center: [121.5654, 25.0330],
                zoom: 12
            });
            break;

        case 'public':
            map.flyTo({
                center: [121.534441, 25.014688],
                zoom: 14
            });
            break;

        case 'business':
            map.flyTo({
                center: [121.564472, 25.039372],
                zoom: 14
            });
            break;

        case 'tourism':
            map.flyTo({
                center: [121.533569, 25.033986],
                zoom: 14
            });
            break;

        default:
            console.warn('Unknown section:', section);
            break;
    }
}

// 添加腳踏車站點標記的函數（只執行一次）
function addBikeStations(map) {
    fetch("/station_data")
        .then(response => response.json())
        .then(data => {
            data.forEach(station => {
                // 建立自定義的地圖標記
                const el = document.createElement('div');
                el.className = 'station-marker';

                // 動態設置標記的大小和顏色
                const availableRatio = station.available_rent_bikes / station.total;
                const size = getIconSize(availableRatio);
                el.style.width = `${size}px`;
                el.style.height = `${size}px`;
                el.style.backgroundColor = getIconColor(availableRatio);
                el.style.borderRadius = '50%';

                // 創建地圖標記並將其添加到地圖
                new mapboxgl.Marker(el)
                    .setLngLat([station.longitude, station.latitude])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 })
                            .setHTML(`
                                <h3>${station.sna}</h3>
                                <p>Available Bikes: ${station.available_rent_bikes}</p>
                                <p>Return Slots: ${station.available_return_bikes}</p>
                                <p>Last Updated: ${station.infoTime}</p>
                            `)
                    )
                    .addTo(map);
            });
        })
        .catch(error => console.error('Error fetching bike station data:', error));
}

// 工具函數：根據可用比例動態設置標記的大小
function getIconSize(ratio) {
    return Math.max(10, ratio * 15); // 設置最小大小和比例，例如最大為 30px
}

// 工具函數：根據可用比例動態設置標記的顏色
function getIconColor(ratio) {
    if (ratio > 0.75) {
        return 'green';
    } else if (ratio > 0.5) {
        return 'orange';
    } else {
        return 'red';
    } 
}

function initializeChart() {
   // 清空 chart 容器
   d3.select("#chart").selectAll("*").remove();
   fetch("/station_data")
    .then(response => response.json())
    .then(data => {
        // 將資料重新組織成 sarea 和 sna 階層結構
        const areaData = Array.from(d3.group(data, d => d.sarea), ([sarea, stations]) => ({
            name: sarea,
            children: Array.from(d3.group(stations, d => d.sna), ([sna, records]) => ({
                name: sna,
                value: d3.sum(records, d => d.available_rent_bikes)
            }))
        }));

        const root = d3.hierarchy({ children: areaData })
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        const width = 1000;
        const height = 800;
        const svg = d3.select("#chart")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const pack = d3.pack()
            .size([width, height])
            .padding(3);

        pack(root);

        let focus = root;
        const nodes = root.descendants();
        
        // 定義顏色比例尺
        const color = d3.scaleSequential([0, d3.max(data, d => d.available_rent_bikes)], d3.interpolateBlues);

        // 繪製圓形
        const circle = svg.selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("fill", d => d.children ? "#ddd" : color(d.value))
            .attr("pointer-events", d => d.children ? "none" : "all")
            .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

        // 加上標籤
        const label = svg.selectAll("text")
            .data(nodes)
            .join("text")
            .attr("class", "circle-label")
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
            .text(d => d.data.name);

        // 定義圓圈位置
        function positionCircles() {
            circle
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", d => d.r);

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        }

        positionCircles();
    })
}

function updateChart(section) {
    if (section === '3') {
        // 將地圖容器隱藏
        document.getElementById("renderSection").style.display = "none";
        document.getElementById("chart").style.display = "block";
        initializeChart();
    }
}

// 使用 IntersectionObserver 來監聽滾動事件
const contentParts = document.querySelectorAll(".content-part");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
      if (entry.isIntersecting) {
          const section = entry.target.getAttribute("data-section");
          console.log(section);
          updateMapView(section); // 更新地圖
          updateChart(section); // 更新圖表
      }
  });
}, { 
  threshold: 0.5, 
  rootMargin: '0px 0px -80% 0px'
});

contentParts.forEach(part => {
  observer.observe(part);
});

// 初始載入第一個圖表數據
initializeMap()
window.addEventListener("resize", initializeChart);
