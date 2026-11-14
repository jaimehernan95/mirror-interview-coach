import { ensureAtlasIndexes, ATLAS_VECTOR_SEARCH_INDEX_DEFINITION } from "../lib/db/atlasIndexes";

async function main() {
  console.log("==================================================");
  console.log("  Setting up MongoDB Atlas for Mirror Interview Coach");
  console.log("  Database: interview_coach");
  console.log("==================================================");

  try {
    const res = await ensureAtlasIndexes();
    console.log("✅ Standard and TTL indexes created successfully:", res.created);
    console.log("\nAtlas Vector Search Index Definition:");
    console.log(JSON.stringify(ATLAS_VECTOR_SEARCH_INDEX_DEFINITION, null, 2));
    console.log("\nCopy the JSON above into Atlas Search & Vector Search tab if not automated.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to setup Atlas indexes:", error);
    process.exit(1);
  }
}

main();
