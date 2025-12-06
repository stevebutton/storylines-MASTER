import StoryMap from './pages/StoryMap';
import StoryEditor from './pages/StoryEditor';
import Stories from './pages/Stories';
import LocationPickerPage from './pages/LocationPickerPage';
import ChapterPreview from './pages/ChapterPreview';
import MediaLibrary from './pages/MediaLibrary';
import StoryViewer from './pages/StoryViewer';


export const PAGES = {
    "StoryMap": StoryMap,
    "StoryEditor": StoryEditor,
    "Stories": Stories,
    "LocationPickerPage": LocationPickerPage,
    "ChapterPreview": ChapterPreview,
    "MediaLibrary": MediaLibrary,
    "StoryViewer": StoryViewer,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
};