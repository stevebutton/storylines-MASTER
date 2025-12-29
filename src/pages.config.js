import ChapterPreview from './pages/ChapterPreview';
import Home from './pages/Home';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import Stories from './pages/Stories';
import StoryEditor from './pages/StoryEditor';
import StoryMap from './pages/StoryMap';
import StoryMapView from './pages/StoryMapView';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChapterPreview": ChapterPreview,
    "Home": Home,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "Stories": Stories,
    "StoryEditor": StoryEditor,
    "StoryMap": StoryMap,
    "StoryMapView": StoryMapView,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
    Layout: __Layout,
};