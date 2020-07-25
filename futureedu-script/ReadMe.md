## ENVIRONMENT

Create .env file with
FUTURE_API_KEY=<API KEY> from futureapi.com
BEARER_TOKEN= Token of the user who will be updating the videos.

## TODO

1. [x] Function to download youtube video and download subtitle video.
2. [x] Function to convert it to h265
3. [x] Function to upload to cloudinary and get the url.
4. [x] Function to translate the video and get the url.
5. [x] Download the video and convert to h265.
6. [x] Create a pipeline to download youtube video convert to h264, then translate it to array of languages and then download them from s3, upload it to cloudinary and add an entry into the postgre database.

# DB Connection local

heroku pg:psql postgresql-animated-16270 --app thawing-harbor-71811

# Postgresql Commands

ALTER TABLE "Videos" ADD COLUMN "parentid" VARCHAR;

ffmpeg -i "Camera With Person.mp4" -vcodec libx264 -pix_fmt yuv420p movie.mp4
