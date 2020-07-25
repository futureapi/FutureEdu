require("dotenv").config();
const fs = require("fs");
const youtubedl = require("youtube-dl");
const { v4: uuidv4 } = require("uuid");
var ffmpeg = require("fluent-ffmpeg");
var command = ffmpeg();
var request = require("request");
const { DownloaderHelper } = require("node-downloader-helper");
const BEARER_TOKEN = process.env.BEARER_TOKEN;

const downloadVideoFromYoutube = async url => {
  var response = {
    path: "videos/youtube/",
    filename: uuidv4() + ".mp4",
    info: {},
  };
  return new Promise((resolve, reject) => {
    const video = youtubedl(
      url,
      // Optional arguments passed to youtube-dl.
      ["--format=18"],
      // Additional options can be given for calling `child_process.execFile()`.
      { cwd: __dirname }
    );

    // Will be called when the download starts.
    video.on("info", function (info) {
      console.log("Download started");
      console.log("filename: " + info._filename);
      console.log("size: " + info.size);
      response.info = info;
    });

    video.pipe(fs.createWriteStream(response.path + response.filename));
    video.on("end", function end() {
      resolve(response);
    });
  });
};

const downloadSubtitle = async url => {
  let res = {
    files: [],
    path: "/subtitles/",
    error: false,
  };

  const options = {
    // Write automatic subtitle file (youtube only)
    auto: false,
    // Downloads all the available subtitles.
    all: true,
    // Subtitle format. YouTube generated subtitles
    // are available ttml or vtt.
    format: "vtt",
    // Languages of subtitles to download, separated by commas.
    lang: "en",
    // The directory to save the downloaded files in.
    cwd: __dirname + res.path,
  };

  return new Promise((resolve, reject) => {
    youtubedl.getSubs(url, options, function (err, files) {
      if (err) {
        res.error = err;
        return reject(err);
      }
      res.files = files;
      console.log("subtitle files downloaded:", files);
      return resolve(res);
    });
  });
};

const convertVideoToh265 = async (path, outputPath) => {
  return new Promise((resolve, reject) => {
    if (!path) {
      path =
        "/Users/skytreasure/fxpi/futureapi/assets/sampleTestVideos/Camera With Person.mp4";
    }
    if (!outputPath) {
      outputPath = "videos/sample.mp4";
    }

    ffmpeg()
      .input(path)
      .videoCodec("libx264")
      .audioCodec("copy")
      .outputOptions([
        "-preset medium",
        "-tune stillimage",
        "-crf 25",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", function () {
        console.log("Processing finished !");
        resolve(outputPath);
      })
      .run();
  });
};

const uploadToCloudinary = (localPath, filename) => {
  return new Promise((resolve, reject) => {
    if (!localPath) {
      localPath =
        "/Users/skytreasure/fxpi/futureapi/assets/sampleTestVideos/Camera With Person.mp4";
    }
    if (!filename) {
      filename = uuidv4() + ".mp4";
    }
    var options = {
      method: "GET",
      url:
        "https://api.cloudinary.com/v1_1/" +
        process.env.CLOUDINARY_PROJECT_NAME +
        "/video/upload",
      headers: {},
      formData: {
        file: {
          value: fs.createReadStream(localPath),
          options: {
            filename: filename,
            contentType: null,
          },
        },
        upload_preset: "default",
      },
    };
    request(options, function (error, response) {
      if (error) {
        reject(error);
      }
      console.log(response.body);
      resolve(JSON.parse(response.body).url);
    });
  });
};

const sleep = millis => {
  return new Promise(resolve => setTimeout(resolve, millis));
};

const translateVideo = async obj => {
  if (!obj) {
    obj = {
      videourl: "https://transcribe-bkt.s3.us-east-2.amazonaws.com/topgun.mp4",
      targetlanguage: "japanese",
      sourcelanguage: "english",
      videotype: "mp4",
      gender: "male",
      outputvideoname: "topgun_japanese",
    };
  }
  var translateInitPromise = new Promise((resolve, reject) => {
    var options = {
      method: "POST",
      url: "https://api.futureapi.com/v1/video-translation",
      headers: {
        "x-api-key": process.env.FUTURE_API_KEY,
        "x-api-version": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videourl: obj.videourl,
        targetlanguage: obj.targetlanguage,
        sourcelanguage: obj.sourcelanguage,
        videotype: obj.videotype,
        gender: obj.gender,
        outputvideoname: obj.outputvideoname,
      }),
    };
    request(options, function (error, response) {
      if (error) {
        reject(error);
      }
      console.log(response.body);
      resolve(JSON.parse(response.body));
    });
  });
  return new Promise((resolve, reject) => {
    translateInitPromise.then(async res => {
      var status = "IN-PROGRESS";
      const uuid = res.uuid;
      var apiStatusResponse = {};
      while (status == "IN-PROGRESS") {
        console.log(".");
        await sleep(30 * 1000);
        var options = {
          method: "GET",
          url: "https://api.futureapi.com/v1/status/" + uuid,
          headers: {
            "x-api-key": process.env.FUTURE_API_KEY,
            "x-api-version": "1",
          },
          form: {},
        };
        request(options, function (error, response) {
          if (error) throw new Error(error);
          console.log(response.body);
          apiStatusResponse = JSON.parse(response.body);
          status = apiStatusResponse.status;
        });
      }
      if (status == "SUCCESS") {
        resolve(apiStatusResponse.response.result.video);
      } else {
        reject(apiStatusResponse.response.error);
      }
    });
  });
};

const dowloadS3Video = url => {
  if (!url) {
    url =
      "https://studio-bkt.s3-us-west-2.amazonaws.com/prod/Jul-23-2020/outputvideo/bd1175f3-4e35-49a4-b161-e6ccfddd0579_07-2020_topgun_japanese.mp4";
  }
  return new Promise((resolve, reject) => {
    const dl = new DownloaderHelper(url, __dirname + "/videos/s3/");

    dl.on("end", downloadInfo => {
      console.log("Download Completed", downloadInfo);
      resolve(downloadInfo);
    });
    dl.start();
  });
};

const updateVideoTable = async obj => {
  if (!obj) {
    obj = {
      title: "Sample Title",
      description: "Sample Description",
      url:
        "https://res.cloudinary.com/" +
        process.env.CLOUDINARY_PROJECT_NAME +
        "/video/upload/v1595444969/uploads/qlldsnexo6gqnxobdhot.mp4",
      thumbnail:
        "https://res.cloudinary.com/" +
        process.env.CLOUDINARY_PROJECT_NAME +
        "/video/upload/v1595444969/uploads/qlldsnexo6gqnxobdhot.jpg",
      parentid: "",
      language: "English",
    };
  }
  return new Promise((resolve, reject) => {
    var options = {
      method: "POST",
      url: "https://thawing-harbor-71811.herokuapp.com/api/v1/videos",
      headers: {
        Authorization: "Bearer " + BEARER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: obj.title,
        description: obj.description,
        url: obj.url,
        thumbnail: obj.thumbnail,
        parentid: obj.parentid,
        language: obj.language,
      }),
    };
    request(options, function (error, response) {
      if (error) {
        reject(error);
      }
      // console.log(response.body);
      resolve(JSON.parse(response.body));
    });
  });
};

const getLabel = str => {
  return str[0].toUpperCase() + str.slice(1);
};

module.exports = {
  downloadVideoFromYoutube: downloadVideoFromYoutube,
  downloadSubtitle: downloadSubtitle,
  convertVideoToh265: convertVideoToh265,
  uploadToCloudinary: uploadToCloudinary,
  sleep: sleep,
  dowloadS3Video: dowloadS3Video,
  updateVideoTable: updateVideoTable,
  getLabel: getLabel,
  translateVideo: translateVideo,
};

// dowloadS3Video()
//   .then(res => {
//     convertVideoToh265(res.filePath, "videos/test.mp4").then(res => {
//       console.log("SUCCESS:", res);
//     });
//   })
//   .catch(err => {
//     console.log("ERROR:", err);
//   });

// convertVideoToh265().then(res => {
//   console.log("SUCCESS:", res);
// });

// translateVideo()
//   .then(res => {
//     console.log("SUCCESS:", res);
//   })
//   .catch(err => {
//     console.log("ERROR:", err);
//   });

// uploadToCloudinary().then(res => {
//   console.log("FILE URL:", res);
// });

// downloadVideoFromYoutube(
//   "https://www.youtube.com/watch?v=1dZsuE0vxEI&list=PLSQl0a2vh4HCixML_VBGnnku7JkSkfRfH&index=2&t=0s"
// ).then(res => {
//   console.log("\nDone");
//   console.log("Result:", JSON.stringify(res));
// });

// downloadSubtitle(
//   "https://www.youtube.com/watch?v=1dZsuE0vxEI&list=PLSQl0a2vh4HCixML_VBGnnku7JkSkfRfH&index=2&t=0s"
// ).then(response => {
//   console.log(JSON.stringify(response));
// });

// convertVideoToh264().then(res => {
//   console.log(res);
// });
