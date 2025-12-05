import StoryMap from './pages/StoryMap';
import StoryEditor from './pages/StoryEditor';
import Stories from './pages/Stories';
import StoryMapView from './pages/StoryMapView';
import LocationPickerPage from './pages/LocationPickerPage';


export const PAGES = {
    "StoryMap": StoryMap,
    "StoryEditor": StoryEditor,
    "Stories": Stories,
    "StoryMapView": StoryMapView,
    "LocationPickerPage": LocationPickerPage,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
};