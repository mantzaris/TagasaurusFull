const GET_ALL_FACECLUSTERS_STMT = DB.prepare(`SELECT ROWID, * FROM ${FACECLUSTERS_TABLE_NAME}`);
const INSERT_FACECLUSTER_STMT = DB.prepare(`INSERT INTO ${FACECLUSTERS_TABLE_NAME} (avgDescriptor, relatedFaces, keywords, images, thumbnail ) VALUES ( ?, ?, ?, ?, ?)`);
const DELETE_EMPTY_FACECLUSTER_STMT = DB.prepare(`DELETE FROM ${FACECLUSTERS_TABLE_NAME} WHERE relatedFaces=?`);
const UPDATE_FACECLUSTER_STMT = DB.prepare(`UPDATE ${FACECLUSTERS_TABLE_NAME} SET avgDescriptor=?, relatedFaces=?, keywords=?, images=? WHERE ROWID=?`);
const UPDATE_FACECLUSTER_THUMBNAIL_STMT = DB.prepare(`UPDATE ${FACECLUSTERS_TABLE_NAME} SET thumbnail=? WHERE ROWID=?`);
const GET_LAST_ROWID_STMT = DB.prepare(`SELECT last_insert_rowid()`);

RECORD_PARSER_MAP.set(FACECLUSTERS_TABLE_NAME, Get_Obj_Fields_From_FaceCluster);

function Get_Obj_Fields_From_FaceCluster(record) {
  record.avgDescriptor = JSON.parse(record.avgDescriptor);
  record.relatedFaces = JSON.parse(record.relatedFaces);
  record.keywords = JSON.parse(record.keywords);
  record.images = JSON.parse(record.images);
  return record;
}

function Get_FaceClusters_From_IDS(ids) {
  if (!ids || ids.length == 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  let res = DB.prepare(`SELECT ROWID, * FROM ${FACECLUSTERS_TABLE_NAME} WHERE ${FACECLUSTERS_TABLE_NAME}.ROWID IN (${placeholders})`).all(...ids);
  return res.map((r) => {
    return {
      ...r,
      avgDescriptor: JSON.parse(r.avgDescriptor),
      relatedFaces: JSON.parse(r.relatedFaces),
      keywords: JSON.parse(r.keywords),
      images: JSON.parse(r.images),
    };
  });
}

exports.Get_FaceClusters_From_IDS = Get_FaceClusters_From_IDS;

function Delete_FaceClusters_By_IDS(ids) {
  const placeholders = ids.map(() => '?').join(',');
  return DB.prepare(`DELETE FROM ${FACECLUSTERS_TABLE_NAME} WHERE ${FACECLUSTERS_TABLE_NAME}.ROWID IN (${placeholders})`).run(...ids);
}

exports.Delete_FaceClusters_By_IDS = Delete_FaceClusters_By_IDS;

function Get_All_FaceClusters() {
  const allClusters = GET_ALL_FACECLUSTERS_STMT.all();

  for (let i = 0; i < allClusters.length; i++) {
    const c = allClusters[i];
    c.avgDescriptor = JSON.parse(c.avgDescriptor);
    c.relatedFaces = JSON.parse(c.relatedFaces);
    c.keywords = JSON.parse(c.keywords);

    c.images = JSON.parse(c.images);
  }

  return allClusters;
}

exports.Get_All_FaceClusters = Get_All_FaceClusters;

function Get_Last_Rowid() {
  return GET_LAST_ROWID_STMT.get();
}

exports.Get_Last_Rowid = Get_Last_Rowid;

function Insert_FaceCluster(avgDescriptor, relatedFaces, keywords, images, thumbnail) {
  const res = INSERT_FACECLUSTER_STMT.run(
    JSON.stringify(Array.from(avgDescriptor)),
    JSON.stringify(relatedFaces),
    JSON.stringify(keywords),
    JSON.stringify(images),
    thumbnail
  );

  return res.lastInsertRowid;
}

exports.Insert_FaceCluster = Insert_FaceCluster;

function Update_FaceCluster_ROWID(avgDescriptor, relatedFaces, keywords, images, ROWID) {
  UPDATE_FACECLUSTER_STMT.run(JSON.stringify(Array.from(avgDescriptor)), JSON.stringify(relatedFaces), JSON.stringify(keywords), JSON.stringify(images), ROWID);
}

exports.Update_FaceCluster_ROWID = Update_FaceCluster_ROWID;

function Delete_All_Empty_FaceClusters() {
  DELETE_EMPTY_FACECLUSTER_STMT.run(JSON.stringify([]));
}

exports.Delete_All_Empty_FaceClusters = Delete_All_Empty_FaceClusters;

function Update_FaceCluster_Thumbnail(rowid, thumbnail) {
  UPDATE_FACECLUSTER_THUMBNAIL_STMT.run(thumbnail, rowid);
}

exports.Update_FaceCluster_Thumbnail = Update_FaceCluster_Thumbnail;
