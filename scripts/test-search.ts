async function run() {
  try {
    console.log("Fetching search api...");
    const res = await fetch("http://localhost:3000/api/search?q=batman");
    const json = await res.json();
    console.log("Result:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
