/* Approved champion/classic photo selections live separately from ranking uploads.
 * Change this registry when selecting a new photo; data.json remains the ranking source. */
(function(root){
  'use strict';
  const selections={
  "heroImgById": {
    "2396": "champion-yudi-2396-weekly.jpg",
    "506": "champion-506-weekly.jpg",
    "1711": "champion-1711-weekly.jpg",
    "1712": "champion-1712-weekly.jpg",
    "1750": "champion-1750-weekly.jpg",
    "1860": "champion-1860-weekly.jpg",
    "1865": "champion-1865-weekly.jpg",
    "1910": "champion-1910-weekly.jpg",
    "1932": "champion-1932-weekly.jpg",
    "1954": "champion-1954-weekly.jpg",
    "2017": "champion-2017-weekly.jpg",
    "2024": "champion-2024-weekly.jpg",
    "2094": "champion-2094-weekly.jpg",
    "2103": "champion-2103-weekly.jpg",
    "2151": "champion-2151-weekly.jpg",
    "2163": "champion-yeha-2163.jpg",
    "2226": "champion-ju-2226-weekly.jpg",
    "2267": "champion-suji-2267.jpg",
    "2343": "ria-2343.jpg"
  },
  "monthImg": {
    "2026-09": "champion-ju-2226-monthly.jpg",
    "2026-08": "champion-2094-monthly.jpg",
    "2026-07": "champion-1910-monthly.jpg",
    "2026-06": "champion-1750-monthly.jpg",
    "2026-05": "champion-1712-monthly.jpg"
  },
  "heroPositionById": {
    "2396": "center top",
    "506": "center 55%",
    "1711": "center top",
    "1712": "center top",
    "1750": "center 20%",
    "1860": "center 35%",
    "1865": "center 30%",
    "1910": "center 20%",
    "1932": "center 15%",
    "1954": "center 5%",
    "2017": "center 40%",
    "2024": "center 45%",
    "2094": "center 25%",
    "2103": "center top",
    "2151": "center top",
    "2163": "right top",
    "2226": "center",
    "2267": "center 18%"
  },
  "heroScaleById": {
    "2396": 1,
    "506": 1.25,
    "1711": 1.2,
    "1712": 1.5,
    "1750": 1,
    "1860": 1,
    "1865": 1.35,
    "1910": 1,
    "1932": 1.4,
    "1954": 1.5,
    "2017": 1.35,
    "2024": 1.3,
    "2094": 1,
    "2103": 1,
    "2151": 1,
    "2163": 1.4,
    "2226": 1
  },
  "heroOriginById": {
    "2396": "center top",
    "506": "center top",
    "1711": "center top",
    "1712": "65% top",
    "1750": "center top",
    "1860": "center top",
    "1865": "center top",
    "1910": "center top",
    "1932": "center top",
    "1954": "center top",
    "2017": "center top",
    "2024": "center top",
    "2094": "center top",
    "2103": "center top",
    "2151": "center top",
    "2163": "right top",
    "2226": "center"
  },
  "monthPhotoLayout": {
    "2026-09": {
      "position": "center",
      "scale": 1,
      "origin": "center"
    },
    "2026-08": {
      "position": "center top",
      "scale": 1.15,
      "origin": "center top"
    },
    "2026-07": {
      "position": "center 20%",
      "scale": 1,
      "origin": "center top"
    },
    "2026-06": {
      "position": "center 20%",
      "scale": 1,
      "origin": "center top"
    },
    "2026-05": {
      "position": "center 20%",
      "scale": 1.8,
      "origin": "65% top"
    }
  },
  "classicImgById": {
    "1495": "champion-classic-1495.jpg",
    "1524": "champion-classic-1524.jpg",
    "1728": "champion-classic-1728.jpg",
    "1750": "champion-1750-weekly.jpg",
    "1910": "champion-1910-weekly.jpg"
  },
  "classicPhotoLayoutById": {
    "1495": {
      "position": "right top",
      "scale": 1.35,
      "origin": "right top"
    },
    "1524": {
      "position": "center 25%",
      "scale": 1,
      "origin": "center"
    },
    "1728": {
      "position": "center 20%",
      "scale": 1.2,
      "origin": "65% top"
    },
    "1750": {
      "position": "center 20%",
      "scale": 1,
      "origin": "center"
    },
    "1910": {
      "position": "center 15%",
      "scale": 1,
      "origin": "center"
    }
  }
};
  function apply(data){
    const result={...data};
    for(const [key,values] of Object.entries(selections)) result[key]={...(data[key]||{}),...values};
    return result;
  }
  const api={apply};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.BCUTChampionPhotos=api;
})(typeof window==='undefined'?globalThis:window);
