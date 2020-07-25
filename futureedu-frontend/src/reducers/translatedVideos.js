import { GET_TRANSLATED_VIDEOS } from "../actions/types";

const initialState = {
  isFetchingV: true,
  videos: [],
};

const translatedVideos = (state = initialState, action) => {
  switch (action.type) {
    case GET_TRANSLATED_VIDEOS:
      return action.payload;
    default:
      return state;
  }
};

export default translatedVideos;
