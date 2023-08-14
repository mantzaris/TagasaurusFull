function Binary_Search(sortedArray, key) {
  let start = 0;
  let end = sortedArray.length - 1;

  while (start <= end) {
    let middle = Math.floor((start + end) / 2);

    if (sortedArray[middle] === key) {
      // found the key
      return middle;
    } else if (sortedArray[middle] < key) {
      // continue searching to the right
      start = middle + 1;
    } else {
      // search searching to the left
      end = middle - 1;
    }
  }
  // key wasn't found
  return start;
}
exports.Binary_Search = Binary_Search;

//use binary search to find the index of the lower bound for the element and insert it in that position
function Insert_Into_Sorted_Array(sortedArray, new_filename) {
  let index_tmp = Binary_Search(sortedArray, new_filename);

  sortedArray.splice(index_tmp, 0, new_filename);
}
exports.Insert_Into_Sorted_Array = Insert_Into_Sorted_Array;
