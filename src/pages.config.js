import StoryMap from './pages/StoryMap';
import StoryEditor from './pages/StoryEditor';
import Stories from './pages/Stories';
import StoryMapView from './pages/StoryMapView';


export const PAGES = {
    "StoryMap": StoryMap,
    "StoryEditor": StoryEditor,
    "Stories": Stories,
    "StoryMapView": StoryMapView,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
};