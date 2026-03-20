/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AudioRecorder from './pages/AudioRecorder';
import HomePageView from './pages/HomePageView';
import HomePageEditor from './pages/HomePageEditor';
import AudioTest from './pages/AudioTest';
import ChapterPreview from './pages/ChapterPreview';
import DocumentManager from './pages/DocumentManager';
import ExitStory from './pages/ExitStory';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import MobileStoryCapture from './pages/MobileStoryCapture';
import ProjectInterface from './pages/ProjectInterface';
import Stories from './pages/Stories';
import StoriesDebug from './pages/StoriesDebug';
import StoriesMap from './pages/StoriesMap';
import StoryEditor from './pages/StoryEditor';
import StoryLibrary from './pages/StoryLibrary';
import StoryMap from './pages/StoryMap';
import StoryMapView from './pages/StoryMapView';
import Storyboarder from './pages/Storyboarder';
import StoryFullscreen from './pages/StoryFullscreen';
import StoryTimeline from './pages/StoryTimeline';
import SeriesEditor from './pages/SeriesEditor';
import SeriesView from './pages/SeriesView';
import Login from './pages/Login';
import LoginEditor from './pages/LoginEditor';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AudioRecorder": AudioRecorder,
    "HomePageView": HomePageView,
    "HomePageEditor": HomePageEditor,
    "AudioTest": AudioTest,
    "ChapterPreview": ChapterPreview,
    "DocumentManager": DocumentManager,
    "ExitStory": ExitStory,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "MobileStoryCapture": MobileStoryCapture,
    "ProjectInterface": ProjectInterface,
    "Stories": Stories,
    "StoriesDebug": StoriesDebug,
    "StoriesMap": StoriesMap,
    "StoryEditor": StoryEditor,
    "StoryFullscreen": StoryFullscreen,
    "StoryLibrary": StoryLibrary,
    "StoryMap": StoryMap,
    "StoryMapView": StoryMapView,
    "Storyboarder": Storyboarder,
    "StoryTimeline": StoryTimeline,
    "SeriesEditor": SeriesEditor,
    "SeriesView": SeriesView,
    "Login": Login,
    "LoginEditor": LoginEditor,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "HomePageView",
    Pages: PAGES,
    Layout: __Layout,
};