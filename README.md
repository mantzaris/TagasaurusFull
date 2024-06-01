## This application presents for users a way of uniquely annotating a locally stored collection of media (image/gif/audio/video/pdf).

Store annotations of various media types using descriptions, emotion label values, and memes. The annotations help for searching afterwards when a lot of files have been added. There is ML to help automatically apply emotions when the images/video have faces and is based on expressions. The ML also helps search for people by identifying faces within images and videos. The search can also be done based on face searching for all the members in the group and for a individual face as well. There is a search mode for streaming from a webcam and from a local application screen to find search matches. A face mapping exploring tool allows for a unique style of hierarchical clustering which avoids processing the full corpus via a 'lazy' algorithm. The data stored locally allows for both imports and exports of all the data. It can be run from a USB or external disk from Windows and using a script from Linux as well when a user downloads the .zip release. The data can be exported for a backup or simply copied and pasted to another location/device/computer and reused. There are installers which are possibly more performant. 

The YouTube channel, [https://www.youtube.com/@tagasaurus_app](https://www.youtube.com/@tagasaurus_app), has tutorials and more.

![tagging](/TagasaurusReflections/screenshot1.png)

![search](/TagasaurusReflections/screenshot2.png)

![collections](/TagasaurusReflections/screenshot3.png)


# Downloads

## Windows
- executable "tagasaurus-1.5.0-win.zip" (unzip and run the executable file): [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.1/tagasaurus-1.5.0-win.zip)
sha256 hash: 6a31da45fe42a403e647c58555991daac257ae0543d0db5725425634bebb2aea

- installer "tagasaurus Setup 1.5.0.exe": [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.1/tagasaurus.Setup.1.5.0.exe)
sha256 hash: 980d871ce60249a2beb41f67e8b09d255c7ea8ddc1fb72de83f87167161cab58

## Linux
- (generic) tagasaurus-1.5.1.zip:[download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.1/tagasaurus-1.5.1.zip)
sha256 hash: 84fe0208198533ae3f26c03aae6b5ae9a398f3711e68d8e71e364903f2307e4c

- Debian Flavors tagasaurus_1.5.1_amd64.deb: [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.1/tagasaurus_1.5.1_amd64.deb)
sha256 hash: c654a6fde035bcad819d7f020b3c3e552cf15235bf572a7d15f3ef50428c4998

- Fedora Flavors (untested) tagasaurus-1.5.1.x86_64.rpm: [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.1/tagasaurus-1.5.1.x86_64.rpm)
sha256 hash: 69aa94aee2469ac1458b930fdf6aa827fd383e06ae605fff453c0e4b366541d3


## Using Tagasaurus

- The main screen shows the various sections/tools available. The key tool is in 'Tagging', this is where images can be inserted into the app, using either the upload button or dragging and dropping a file onto the center of the tagging screen. From the tagging screen users can right click on images to save them individually and search. Memes can be added and after adding memes they can be clicked to toggle a full screen view. When inserting audio or video files, if the format is not a common one like mp3/mp4 the app will convert them to mp3/mp4 and hold that new version instead (this may take time and users must be patient). When images/videos are uploaded the ML looks for faces in the image and at intervals within the video for faces storing descriptors which help latter identify the face when doing face similarity search. The descriptions when saved have keywords produced to find the image later. Emotions are labels with values between -100 and +100 and help for positive or negative label matching for later searches. Users can insert images/video recorded from the webcam directly. 
- Searching (except Collecetion search) is unique in this app due to the way it is connected with memes. Within each search a panel of direct results and then associated memes are produced as ranked by a score. This scoring is outlined in more detail in [link](https://www.sciencedirect.com/science/article/pii/S2665963821000658?via%3Dihub) [link](https://doi.org/10.3390/technologies9030045). The non-memes are ranked by the number of keyword/tag overlaps, the emotion/value overlaps and the meme keywords with the entry tags of the memes. For the last part, if you have an image with a set of memes those memes are entries themselves with their own keywords/tags, so that you can add meme tags to add scores of entries with memes containing those keywords. For the meme column of results this searches for entries that are memes which align with the criteria provided (searching for entries with certain tags you also get the memes most associated with those entries). There is a cap of around a few hundred results returned for the search.
- Collections allow for media of all types to be included and can be thought of as an annotation entry of multiple media. A description for the collection can be produced as well as a separate set of memes and emotions. The files a collection is associated with each have their own annotations. A search tool for collections also exists. The collections are based on the collection names. When a tagging entry is deleted and is part of a collection, its membership in the collection is removed.
- Super Search is similar to the search in Tagging with the additions that face similarity can be used by files not in the DB yet, and multiple face containing files can be included to search based on a set of faces manually.
- Stream Search will scan the stream from a webcam, or appliction window (eg browser) for faces and look for them in the DB and similar ones can have the keywords, closest images and memes presented so that clicking on an image takes the user to the entry. The stream can be paused and restarted, and clicking on a face puts makes the program home on the face rather than scan for a few seconds on each face prior to moving faces.
- Face Explore presents an initial random selection of faces from images in the DB. Those can be clicked to find the faces which are considered 'midpoints' from the other images of the graph vicinity. The closest faces are shown in a side bar which upon clicking will take the user to that entry. Clicking on images in the graph will allow the user to explore faces in the DB, and the algorithm is 'lazy' so that it should not get stuck on large corpus sizes.
- Export allows the user to export all the content/media and annotation data to be later imported/merged into another Tagasaurus instance. This can help backup and merge. For backups the 2 top folders can be copied and pasted to other locations and simply run when using the .zip executables instead of the installers. The merging combines text descriptions, averages overlaping emotions, combines meme sets for both tagging and collections. For the web app the exported .zip is needed. 
- Import allows the user to use another Taga export to merge all the entries which overlap based on the unique file hashes and augment the data entries for new files and collections.
- Settings help configure the app experience.

## Extra

One purpose is to streamline the annotation process with the necessary emotional granulatiry required for training ML. This tool is expected to allow teams to produce datasets as training and validation datasets where the annotations are easily organized. The other is to reduce cognitive fatigue when annotating many files and have compact placement for backups.

If you use this work in an academic publication, please use the references:

```
Mantzaris AV, Pandohie R, Hopwood M, Pho P, Ehling D.
"Tagasaurus, a tool to assist manual image tagging and the creation of image collections"
[doi link](  \url{https://www.sciencedirect.com/science/article/pii/S2665963821000658?via%3Dihub}) and the Elsevier webpage [link](https://www.sciencedirect.com/science/article/pii/S2665963821000658?via%3Dihub)
```

```
Mantzaris AV, Pandohie R, Hopwood M, Pho P, Ehling D, Walker TG.
"Introducing Tagasaurus, an Approach to Reduce Cognitive Fatigue from Long-Term Interface Usage When Storing Descriptions and Impressions from Photographs."
Technologies. 2021; 9(3):45. https://doi.org/10.3390/technologies9030045
```

Connect on the social

- https://twitter.com/Tagasaurus_app
- https://www.facebook.com/TagasaurusApp/

### (**Check out cool comic books and more from the author Vasexandros at [amazon](https://www.amazon.com/Vasexandros/e/B010RI6W0G%3Fref=dbs_a_mng_rwt_scns_share)**)

<!---

_also, the books by the author vasexandros are really worth the read_ [link](https://www.amazon.com/Vasexandros/e/B010RI6W0G%3Fref=dbs_a_mng_rwt_scns_share)

# <span style="color:orange">Tagasaurus, the gateway to your semantic multiverse </span>

### <span style="color:red">let's drop the '**U**' from '**U-RL**' because why do we need a UNI-verse and the UNI-queness it imposes?.. let's break free of that and "Tag the Planet!" </span>

---

For the development phase, this principle must be put in top priority
1. The data the users hold is **key**. The tool must smoothly incentivize the users to want to describe content with tags


**I highly recommend you take a look at the literature of the author Vasexandros at [amazon](https://www.amazon.com/Vasexandros/e/B010RI6W0G%3Fref=dbs_a_mng_rwt_scns_share)**
-->
