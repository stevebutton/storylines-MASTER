import StoryMap from './pages/StoryMap';
import StoryEditor from './pages/StoryEditor';
import Stories from './pages/Stories';
import StoryMapView from './pages/StoryMapView';
import LocationPickerPage from './pages/LocationPickerPage';
import ChapterPreview from './pages/ChapterPreview';
import MediaLibrary from './pages/MediaLibrary';


export const PAGES = {
    "StoryMap": StoryMap,
    "StoryEditor": StoryEditor,
    "Stories": Stories,
    "StoryMapView": StoryMapView,
    "LocationPickerPage": LocationPickerPage,
    "ChapterPreview": ChapterPreview,
    "MediaLibrary": MediaLibrary,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
};