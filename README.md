## This application presents for users a way of uniquely annotating a locally stored collection of media (image/gif/audio/video/pdf).

A key feature is that emotions are stored by the user's explicit input over a set of values for a set of different emotions. This is in contrast to many models where emoticons represent a small set of specific emotions a user must choose from rather than _tune_. Another key feature is the ability for any image (or any media file) to become a meme of another image. Collections of media content with memes can also be made. The user has the ability to search through images and collections based upon the annotation information overlaps, and also find relevant memes through the use of a search on the bi-partite graph. That is 'which images are memes to images with such criteria?'. The current version 1.5.0 is now compatible with the webapp (www.tagyourplanet.com) where data can be exported and imported between those apps and from different platforms.

The YouTube channel, [https://www.youtube.com/@tagasaurus_app](https://www.youtube.com/@tagasaurus_app), has tutorials and more.


![tagging](/TagasaurusReflections/screenshot1.png)

![search](/TagasaurusReflections/screenshot2.png)

![collections](/TagasaurusReflections/screenshot3.png)


# Downloads

## Windows
- executable "tagasaurus-1.5.0-win.zip" (unzip and run the executable file): [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.0/tagasaurus-1.5.0-win.zip)
sha256 hash: 6a31da45fe42a403e647c58555991daac257ae0543d0db5725425634bebb2aea

- installer "tagasaurus Setup 1.5.0.exe": [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.0/tagasaurus.Setup.1.5.0.exe)
sha256 hash: 980d871ce60249a2beb41f67e8b09d255c7ea8ddc1fb72de83f87167161cab58

## Linux
- (generic) tagasaurus-1.5.0.zip:[download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.0/tagasaurus-1.5.0.zip)
sha256 hash: a17df7f609cdb2399a16bca659376a08b64b6b5a6f091f0c8822a1d00693ac52

- Debian Flavors tagasaurus_1.5.0_amd64.deb: [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.0/tagasaurus_1.5.0_amd64.deb)
sha256 hash: 97c368518b5ada77ab41a889c5ebe68c72fcac0a6e388edcd51bb05bb1c296c6

- Fedora Flavors (untested) tagasaurus-1.5.0.x86_64.rpm: [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.5.0/tagasaurus-1.5.0.x86_64.rpm)
sha256 hash: 096962bbcb29e70d2f6a34c47585e344d3415340da9eeaf8cdf20e2a1f181ab9


## Using Tagasaurus

- The main menu lists the main actions to take and some scores to track the % of the images have been tagged or not.
- New images can be loaded into the app when you go into the _tagging_ page. The uploaded images then live in the taga space so they persist when deleted from their original position.
- The tagging phase allows you to add text, emotions and memes (which are other images and any image can become a meme for another image).
- Collection can be produced but in this page new images cannot be imported; only during tagging. A collection creation wizard helps a user produce a collection.
- Searching allows you to find a rank of relevant images based upon the overlap of the annotations with the search criteria. The searching also finds images which are memes for the criteria you searched for. When searching for memes to add this works in the opposite direction. Eg. when searching for a meme you may ask which are the memes relevant to images with this criteria (success kid with happy celebrations in the meme bar and parties/weddings in the image bar).The opposite question can be asked when looking for the criteria of the success kid with the images associated with it.
- If an image is not in the main focus you can click on it to bring it to focus in a modal.
- To back-up your annotations you can export all the data which copies over all the files, database (sqlite3) and produces a text based set of files with the annotation data (for analytics). This can be re-imported later on or given to another taga user to 'import'. Upon imported if the same images are present a 'merge' of the data is produced. Same for the collections where the gallery is appended.
- Updating if you delete the app and then re-install another version (or same version) your data should be there. But you can export and then re-import just to be certain that you don't lose your annotation information.
- Version 1.1.0 onwards allows the user to apply ML that will auto populate the emotions based upon facial expressions and do facial recognition in the searches (from images and video).
- Version 1.2.0 onwards allows a user to import media of Video, Audio and PDF. Linux users can use a script in the folder which remounts a vFAT formated external media with exec permissions.
- Users can export their data and have it imported from another Tagasaurus desktop application or the webapp at tagyourplanet.com

## Scope

This is developed using ElectronJS

Annotations of image taggings involve inputing a textual description from which 'tags' are then produced, then emotional values along different dimensions are taken from the user and there are image links (also known as memes) which the user can choose from. For tagging images, the user is not required to insert any specific information, but for the collection creations there are requirements. When creating a collection via the wizard, if there is missing information which is required a notification is presented with a message.

The purpose is to streamline the annotation process with the necessary emotional granulatiry required for training ML. This tool is expected to allow teams to produce datasets as training and validation datasets where the annotations are easily organized.

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
