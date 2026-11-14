import {
  ensureAtlasIndexes,
  checkVectorSearchIndexStatus,
  createProgrammaticVectorIndex,
  ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
} from "../lib/db/atlasIndexes";

async function main() {
  console.log("==================================================");
  console.log("  Setting up MongoDB Atlas for Mirror Interview Coach");
  console.log("  Database: interview_coach");
  console.log("==================================================");

  try {
    const res = await ensureAtlasIndexes();
    console.log("✅ Standard compound and TTL indexes created:", res.created);

    const prog = await createProgrammaticVectorIndex();
    console.log("ℹ️ Programmatic vector index attempt:", prog.message);

    const status = await checkVectorSearchIndexStatus();
    console.log("\nVector Search Index Status:", status);

    console.log("\nAtlas Vector Search Index Definition required for 'memories':");
    console.log(JSON.stringify(ATLAS_VECTOR_SEARCH_INDEX_DEFINITION, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to setup Atlas indexes:", error);
    process.exit(1);
  }
}

main();
