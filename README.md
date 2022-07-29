
## This application presents for users a way of uniquely annotating a locally stored collection of images.

A key feature is that emotions are stored by the user's explicit input over a set of values for a set of different emotions. This is in contrast to many models where emoticons represent a small set of specific emotions a user must choose from rather than _tune_. Another key feature is the ability for any image to become a meme of another image. Collections of images with memes for a collection can also be made. The user has the ability to search through images and collections based upon the annotation information overlaps, and also find relevant memes through the use of a search on the bi-partite graph. That is 'which images are memes to images with such criteria?'


# Downloads

## Windows 

- Installer:  [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.0.0/tagasaurusWindowsSetup1.0.0.exe) sha256 841d62215ab2dc0340f7b96da46037cccfe7521f973a9f6c46c3de6d97836940

- Zip (unzip and run the executable file):  [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.0.0/tagasaurus-1.0.0-win.zip) sha256 8adf7fa6daf9dbf423aadd98c8874cd30bdbf398d4bc525d9f9f02be2ec887bf

## Linux

- Debian/Ubuntu (.deb, run with dpkg -i):  [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.0.0/tagasaurus_1.0.0_amd64.deb) sha256 hash: f4a3cfa39735af281f8ef27bae7f1101471bfc403dd357142b5018ade07248dd

- Fedora/RHEL (.rpm):  [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.0.0/tagasaurus-1.0.0.x86_64.rpm) sha256 hash: 057c95a6505574c023e45af784d1e1a41a40a2ca905e34fa0c7e4ccab6bfd772

- Generic Linux (.tar.gz, run the binary file 'tagasaurus'):  [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.0.0/tagasaurusLINUX-TARGZ-1.0.0.tar.gz) sha256 hash: 8cfcc906adf1f139ff070fdf62e7374b089bf457d65b31b8e45e80e7ee96063a

- Linux Zip: [download](https://github.com/mantzaris/Tagasaurus/releases/download/1.0.0/tagasaurusLINUX-ZIP-1.0.0.zip) sha256 hash: 51a9621e14d6408d6938757a1a2fff0c1b2b78617af6eb6db651cbf0e4984689


## Using Tagasaurus

- The main menu lists the main actions to take and some scores to track the % of the images have been tagged or not.
- New images can be loaded into the app when you go into the *tagging* page. The uploaded images then live in the taga space so they persist when deleted from their original position.
- The tagging phase allows you to add text, emotions and memes (which are other images and any image can become a meme for another image).
- Collection can be produced but in this page new images cannot be imported; only during tagging. A collection creation wizard helps a user produce a collection. 
- Searching allows you to find a rank of relevant images based upon the overlap of the annotations with the search criteria. The searching also finds images which are memes for the criteria you searched for. When searching for memes to add this works in the opposite direction. Eg. when searching for a meme you may ask which are the memes relevant to images with this criteria (success kid with happy celebrations in the meme bar and parties/weddings in the image bar).The opposite question can be asked when looking for the criteria of the success kid with the images associated with it.  
- If an image is not in the main focus you can click on it to bring it to focus in a modal.
- To back-up your annotations you can export all the data which copies over all the files, database (sqlite3) and produces a text based set of files with the annotation data (for analytics). This can be re-imported later on or given to another taga user to 'import'. Upon imported if the same images are present a 'merge' of the data is produced. Same for the collections where the gallery is appended. 
- Updating if you delete the app and then re-install another version (or same version) your data should be there. But you can export and then re-import just to be certain that you don't lose your annotation information. 


## Scope

This is developed using ElectronJS

It is hoped that the flat level GUI will be intuitive. The welcome screen presents the options to tag images, create entities and also export the data. Tagging individual images involves the user loading in images and providing manually insterted annotations. The entity creation process has a similar workflow with the ability to group together images as a collective entity under the new label that is user provided. Representative images are chosen for the collectives. A wizard is there to assist in the creation of the entities. The export facility produces a JSON with all the image file annotations and entity collection information, with a directory of all the image resources used. 

Annotations of image taggings involve inputing a textual description from which 'tags' are then produced, then emotional values along different dimensions are taken from the user and there are image links (also known as memes) which the user can choose from. For tagging images, the user is not required to insert any specific information, but for the entity creation there are requirements. When creating an entity via the wizard if there is missing information which is required a notification is presented with a message. 

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

![tagging](/TagasaurusReflections/screenshot1.png)

![search](/TagasaurusReflections/screenshot2.png)

![collections](/TagasaurusReflections/screenshot3.png)


Connect on the social

- https://twitter.com/Tagasaurus_app
- https://www.patreon.com/tagasaurus
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
