const {
  downloadVideoFromYoutube,
  sleep,
  downloadSubtitle,
  convertVideoToh265,
  uploadToCloudinary,
  dowloadS3Video,
  updateVideoTable,
  getLabel,
  translateVideo,
} = require("./utils");
const { LANGUAGES } = require("./constants");
const async = require("async");

const translateAndUpload = async youtubeUrl => {
  return new Promise(async (resolve, reject) => {
    //Download Video from youtube
    try {
      var yres = await downloadVideoFromYoutube(YOUTUBE_URL);
      if (yres) {
        var downloadedYtubeVideoPath = yres.path + yres.filename;
        var youtubeInfo = yres.info;
        var title = youtubeInfo.fulltitle;
        var description = youtubeInfo.description;

        if (youtubeInfo.thumbnails.length > 0) {
          var thumbnail =
            youtubeInfo.thumbnails[youtubeInfo.thumbnails.length - 1].url;
        }
      }
    } catch (error) {
      console.log("YOUTUBE DOWNLOAD ERROR:", error);
      reject(error);
    }
    var h265TargetPath = "videos/h265/" + yres.filename;

    //Convert the video to h265
    try {
      var h265FilePath = await convertVideoToh265(
        downloadedYtubeVideoPath,
        h265TargetPath
      );
      if (h265FilePath) {
        console.log("h265 File Saved at:", h265FilePath);
      }
    } catch (error) {
      console.log("ERROR IN CONVERTING TO h265", error);
      reject(error);
    }

    //Upload the file cloudinary & get meta data
    try {
      var cloudinaryUrl = await uploadToCloudinary(h265FilePath);
      if (cloudinaryUrl) {
        console.log("Cloudinary URL:", cloudinaryUrl);
      }
    } catch (error) {
      console.log("ERROR IN UPLOADING TO CLOUDINARY", error);
      reject(error);
    }

    //Update the parent video in the Database
    try {
      let obj = {
        title: title,
        description: description,
        url: cloudinaryUrl,
        thumbnail: thumbnail,
        parentid: "",
        language: "English",
      };
      var dbRes = await updateVideoTable(obj);
      if (dbRes) {
        var parentId = dbRes.data.id;
        console.log("UPDATE THE PARENT DATA");
      }
    } catch (error) {
      console.log("ERROR IN UPDATING PARENT VIDEO TABLE", error);
      reject(error);
    }

    //Get Translated video S3 Urls for all LANGUAGES
    try {
      var translatedAllVideos = await new Promise((resolve, reject) => {
        var allVideos = [];
        async.eachSeries(
          LANGUAGES,
          function (language, cb) {
            let obj = {
              videourl: cloudinaryUrl,
              targetlanguage: language,
              sourcelanguage: "english",
              videotype: "mp4",
              gender: "male",
              outputvideoname: "_" + language,
            };
            translateVideo(obj)
              .then(url => {
                allVideos.push({ language: language, video: url });
                cb(null);
              })
              .catch(err => {
                console.log("ERROR IN TRANSLATING VIDEO TO " + language, err);
                cb(null);
              });
          },
          function (err, results) {
            if (err) {
              reject(err);
            }
            resolve(allVideos);
          }
        );
      });
    } catch (error) {
      console.log("ERROR IN TRANSLATING VIDEOS", error);
      reject(error);
    }

    // Download them to local and start uploading them to Cloudinary and update the records in Database.
    try {
      //   translatedVideosPromise
      //     .then(allVideos => {
      async.eachSeries(
        translatedAllVideos,
        function (item, cb) {
          dowloadS3Video(item.video).then(async res => {
            var cloudinaryUrl = await uploadToCloudinary(res.filePath);
            let obj = {
              title: "[" + getLabel(item.language) + "] " + title,
              description: description,
              url: cloudinaryUrl,
              thumbnail: thumbnail,
              parentid: parentId,
              language: getLabel(item.language),
            };
            var dbRes = await updateVideoTable(obj);
            cb(null);
          });
        },
        function (err, results) {
          console.log("------------------------------------------------");
          console.log("              PROCESS COMPLETED");
          console.log("------------------------------------------------");
          resolve("SUCCESS");
        }
      );
      // })
      // .catch(err => {
      //   console.log("ERROR IN TRANSLATED VIDEOS PROMISE:", err);
      //   reject(err);
      // });
    } catch (error) {
      console.log("ERROR IN SAVING S3 FILE TO LOCAL PATH");
      reject(error);
    }
  });
};

const YOUTUBE_URL = "https://youtu.be/-lUEWEEpmIo";

translateAndUpload(YOUTUBE_URL)
  .then(res => {
    console.log(res);
  })
  .catch(err => {
    console.log("ERROR::::", err);
  });

// convertVideoToh265()
//   .then(res => {
//     console.log("SUCCESS:", res);
//   })
//   .catch(err => {
//     console.log("ERROR:", err);
//   });

// Ffmpeg.getAvailableFormats(function (err, formats) {
//   console.log("Available formats:");
//   console.dir(formats);
// });

// Ffmpeg.getAvailableCodecs(function (err, codecs) {
//   console.log("Available codecs:");
//   console.dir(JSON.stringify(codecs));
// });
