const bodyPart = "chest";
let allData = [];
let currentOffset = 0;
let hasMore = true;
async function t() {
  while(hasMore) {
    const params = new URLSearchParams({ limit: '100', offset: currentOffset.toString() });
    const url = `https://www.exercisedb.dev/api/v1/bodyparts/${encodeURIComponent(bodyPart)}/exercises?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    if(data.success && data.data && data.data.length > 0) {
      allData.push(...data.data);
      if(data.data.length < 100) hasMore = false;
      else currentOffset += 100;
    } else {
      hasMore = false;
    }
  }
  console.log("Total chest:", allData.length);
}
t();
