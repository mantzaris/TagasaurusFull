
## This application presents for users a way of uniquely annotating a locally stored collection of images.

A key feature is that emotions are stored by the user's explicit input over a set of values for a set of different emotions. This is in contrast to many models where emoticons represent a small set of specific emotions a user must choose from rather than _tune_

## Using Tagasaurus

From the top level directory load **nodejs** and in that prompt type `npm start`. 

It is hoped that the flat level GUI will be intuitive. The welcome screen presents the options to tag images, create entities and also export the data. Tagging individual images involves the user loading in images and providing manually insterted annotations. The entity creation process has a similar workflow with the ability to group together images as a collective entity under the new label that is user provided. Representative images are chosen for the collectives. A wizard is there to assist in the creation of the entities. The export facility produces a JSON with all the image file annotations and entity collection information, with a directory of all the image resources used. 

Annotations of image taggings involve inputing a textual description from which 'tags' are then produced, then emotional values along different dimensions are taken from the user and there are image links (also known as memes) which the user can choose from. For tagging images, the user is not required to insert any specific information, but for the entity creation there are requirements. When creating an entity via the wizard if there is missing information which is required a notification is presented with a message. 

The purpose is to streamline the annotation process with the necessary emotional granulatiry required for training ML. This tool is expected to allow teams to produce datasets as training and validation datasets where the annotations are easily organized. 


<!---

If you use this work in an academic publication, please use the reference:
```
Mantzaris AV, Pandohie R, Hopwood M, Pho P, Ehling D, Walker TG. 
"Introducing Tagasaurus, an Approach to Reduce Cognitive Fatigue from Long-Term Interface Usage When Storing Descriptions and Impressions from Photographs."
Technologies. 2021; 9(3):45. https://doi.org/10.3390/technologies9030045 
```

_also, the books by the author vasexandros are really worth the read_ [link](https://www.amazon.com/Vasexandros/e/B010RI6W0G%3Fref=dbs_a_mng_rwt_scns_share)

# <span style="color:orange">Tagasaurus, the gateway to your semantic multiverse </span>

### <span style="color:red">let's drop the '**U**' from '**U-RL**' because why do we need a UNI-verse and the UNI-queness it imposes?.. let's break free of that and "Tag the Planet!" </span>



---

For the development phase, this principle must be put in top priority
1. The data the users hold is **key**. The tool must smoothly incentivize the users to want to describe content with tags


**I highly recommend you take a look at the literature of the author Vasexandros at [amazon](https://www.amazon.com/Vasexandros/e/B010RI6W0G%3Fref=dbs_a_mng_rwt_scns_share)**
-->
