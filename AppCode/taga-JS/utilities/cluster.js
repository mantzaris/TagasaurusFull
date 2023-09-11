const PATH = require('path');
const { DB_MODULE } = require(PATH.join(__dirname, '..', '..', '..', 'constants', 'constants-code.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const MIN_CLUSTER_DIST_SCORE = 0.64;
async function CreateTaggingEntryCluster(tagging_entry) {
  if (tagging_entry.faceDescriptors.length > 0) {
    // TODO: replace with an iterator on clusters to not hold all in memory at same time
    const clusters = await DB_MODULE.Get_All_FaceClusters();

    const parent_cluster_row_ids = [];

    for (const descriptor of tagging_entry.faceDescriptors) {
      const related_clusters = clusters.filter((c) => {
        let score = Get_Descriptors_DistanceScore([c.avgDescriptor], [descriptor]) / 10;

        return score >= MIN_CLUSTER_DIST_SCORE;
      });

      if (related_clusters.length == 0) {
        const cluster = await CreateFaceCluster(descriptor, tagging_entry.fileName, tagging_entry.taggingTags, tagging_entry.taggingMemeChoices);
        parent_cluster_row_ids.push(cluster.rowid);
        clusters.push(cluster);
        continue;
      }

      for (let i = 0; i < related_clusters.length; i++) {
        related_clusters[i].relatedFaces[tagging_entry.fileName] = [descriptor];
        const descriptors_inside_cluster = Object.values(related_clusters[i].relatedFaces).flatMap((a) => a);
        related_clusters[i].images = MergeArrays(related_clusters[i].images, [tagging_entry.fileName]);

        for (const k of tagging_entry.taggingTags) {
          if (k in related_clusters[i].keywords) {
            related_clusters[i].keywords[k] += 1;
            continue;
          }

          related_clusters[i].keywords[k] = 1;
        }

        for (const m of tagging_entry.taggingMemeChoices) {
          if (m in related_clusters[i].memes) {
            related_clusters[i].memes[m] += 1;
            continue;
          }

          related_clusters[i].memes[m] = 1;
        }

        //const keywords_inside_cluster = Object.values()
        related_clusters[i].avgDescriptor = ComputeAvgFaceDescriptor(descriptors_inside_cluster);

        await DB_MODULE.Update_FaceCluster_ROWID(
          related_clusters[i].avgDescriptor,
          related_clusters[i].relatedFaces,
          related_clusters[i].keywords,
          related_clusters[i].images,
          related_clusters[i].rowid
        );
        parent_cluster_row_ids.push(related_clusters[i].rowid);
      }
    }

    const unique_cluster_ids = [...new Set(parent_cluster_row_ids)];
    tagging_entry.faceClusters = unique_cluster_ids;
  }

  return tagging_entry;
}
exports.CreateTaggingEntryCluster = CreateTaggingEntryCluster;

async function CreateFaceCluster(avgDescriptor, fileName, tags) {
  const relatedFaces = {};
  const keywords = {};

  for (const k of tags) {
    keywords[k] = 1;
  }

  relatedFaces[fileName] = [avgDescriptor];

  const rowid = await DB_MODULE.Insert_FaceCluster(avgDescriptor, relatedFaces, keywords, [fileName]); //returns rowid for the new record
  return { rowid, relatedFaces, avgDescriptor };
}

function ComputeAvgFaceDescriptor(descriptors) {
  const avg = new Float32Array(descriptors[0].length);

  for (let offset = 0; offset < avg.length; offset++) {
    let sum = 0;
    for (let vi = 0; vi < descriptors.length; vi++) {
      sum += descriptors[vi][offset];
    }
    avg[offset] = sum / descriptors.length;
  }

  return avg;
}
exports.ComputeAvgFaceDescriptor = ComputeAvgFaceDescriptor;

function MergeArrays(orig, incoming) {
  return [...new Set([...orig, ...incoming])];
}
