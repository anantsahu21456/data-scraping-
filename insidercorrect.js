const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// MongoDB Model
const articleSchema = new mongoose.Schema({
    imageurl: String,
    description: String,
    location: String,
    title: String,
    eventType: String,
    ticketprice: String,
    dateandtime: { type: String, default: 'anonymous' },
    fullUrl: String, // Add URL field
    category: { type: String, default: 'Uncategorized' }, // Adding default category
    hashtags: [String] // Adding hashtags field
}, { timestamps: true });

const Article = mongoose.model('allcorrectdata', articleSchema);

// Function to scrape website
const scrapeWebsite = async (url) => {
    try {
        const response = await axios.get(url);
        const html = response.data;
        console.log(`HTML content fetched from ${url}:`);
        const $ = cheerio.load(html);

        const imageurl = $('#there-you-go').find('.css-5czy92 .css-6nvtdu .css-0 img').attr('src');
        const description = $('#there-you-go').find('.css-31oj63 .text.text-left.css-1rmq8t0 p').text().trim();
        const location = $('#there-you-go').find('.css-31oj63 #section-venue .text.text-left.custom-widget-title.css-1rmq8t0, .text.text-align-left.custom-widget-title h3, .text.text-align-left.custom-widget-title p').text().trim();
        const title = $('#there-you-go').find('.css-1gxwuw0 .css-b3qn21 .css-k008qs h1').text().trim();
        const eventType = $('#there-you-go').find('[data-ref="edp_event_category_tablet"]').text().trim();
        const ticketprice = $('#there-you-go').find('.css-1gxwuw0 .css-b3qn21 .css-kccjyv .css-1s8djm3 p:nth-child(1)').text().trim();
        const dateandtime = $('#there-you-go').find('.css-1cyi4oq .css-b3qn21 .css-ois8gk p').text().trim();

        const { category, hashtags } = getCategoryAndHashtags(title, description);

        const eventObj = {
            imageurl, description, location, title, eventType, ticketprice, dateandtime, fullUrl: url, category, hashtags
        };

        // Save eventObj to MongoDB using Mongoose
        const newArticle = new Article(eventObj);
        await newArticle.save();
        console.log(`Saved event (${category}): ${title}`);

        return eventObj;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
};

// Function to categorize description and generate hashtags
const getCategoryAndHashtags = (title, description) => {
    const titleLowerCase = title.toLowerCase();
    const descriptionLowerCase = description.toLowerCase();

    const categories = {
        'Corporate Events': ['conference', 'seminar', 'trade show', 'product launch', 'team-building', 'annual general meeting', 'agm', 'shareholder meeting', 'networking event', 'business lunch'],
        'Social Events': ['wedding', 'birthday', 'anniversary', 'graduation', 'reunion', 'holiday party', 'baby shower', 'bridal shower', 'engagement party', 'housewarming'],
        'Educational Events': ['workshop', 'training session', 'webinar', 'lecture', 'academic conference', 'panel discussion', 'study group', 'tutoring session', 'open house', 'college fair'],
        'Cultural Events': ['festival', 'art exhibition', 'concert', 'theater performance', 'film screening', 'fashion show', 'heritage celebration', 'cultural fair', 'poetry reading', 'book fair'],
        'Sports Events': ['tournament', 'match', 'race', 'sporting exhibition', 'marathon', 'triathlon', 'fitness challenge', 'sports clinic', 'esports tournament', 'championship'],
        'Charity and Fundraising Events': ['charity gala', 'auction', 'benefit concert', 'fundraising dinner', 'charity walk', 'charity run', 'telethon', 'bake sale', 'car wash', 'raffle'],
        'Community Events': ['street fair', 'parade', "farmer's market", 'block party', 'community cleanup', 'neighborhood watch meeting', 'public forum', 'town hall', 'community potluck', 'meetup'],
        'Political and Government Events': ['political rally', 'town hall meeting', 'government conference', 'debate', 'civic engagement workshop', 'voter registration drive', 'public hearing', 'campaign event', 'policy discussion', 'press conference'],
        'Religious and Spiritual Events': ['church service', 'religious festival', 'spiritual retreat', 'prayer meeting', 'bible study', 'youth group', 'choir practice', 'revival', 'mission trip', 'faith seminar'],
        'Trade and Industry Events': ['exhibition', 'trade fair', 'expo', 'business networking event', 'industry conference', 'product demo', 'sales meeting', 'launch event', 'vendor fair', 'technology showcase'],
        'Music Events': ['concert', 'music festival', 'open mic night', 'battle of the bands', 'choir concert', 'orchestra performance', 'jazz night', 'DJ set', 'karaoke night', 'album release'],
        'Food and Drink Events': ['food festival', 'wine tasting', 'beer festival', 'cooking class', 'food truck rally', 'restaurant week', 'culinary tour', 'farm-to-table dinner', 'brunch', 'happy hour'],
        'Technology Events': ['hackathon', 'tech conference', 'coding bootcamp', 'startup pitch', 'app launch', 'robotics competition', 'cybersecurity seminar', 'tech meetup', 'webinar', 'IT workshop'],
        'Health and Wellness Events': ['health fair', 'yoga class', 'meditation session', 'fitness bootcamp', 'nutrition workshop', 'wellness retreat', 'mental health seminar', 'wellness expo', 'group hike', 'self-care workshop'],
        'Environmental Events': ['clean up drive', 'tree planting', 'recycling drive', 'environmental workshop', 'sustainability conference', 'eco fair', 'nature walk', 'green living expo', 'climate change protest', 'earth day celebration'],
        'Travel and Adventure Events': ['travel expo', 'adventure race', 'scuba diving trip', 'hiking expedition', 'camping trip', 'safari', 'road trip', 'cruise', 'photography tour', 'travel workshop'],
        'Fashion Events': ['fashion show', 'trunk show', 'fashion week', 'style workshop', 'makeup tutorial', 'runway show', 'designer showcase', 'fashion pop-up', 'boutique opening', 'wardrobe consultation'],
        'Literary Events': ['book signing', 'author reading', 'poetry slam', 'book launch', 'literary festival', 'writing workshop', 'storytelling event', 'book club', 'zine fair', 'library event'],
        'Family Events': ['family fun day', 'kids party', 'play date', 'family reunion', 'scavenger hunt', 'children’s theater', 'family game night', 'petting zoo', 'arts and crafts', 'family picnic'],
        'Science Events': ['science fair', 'astronomy night', 'science workshop', 'lab tour', 'STEM camp', 'innovation expo', 'robotics workshop', 'science festival', 'tech talk', 'research symposium'],
        'Film and Media Events': ['film festival', 'movie night', 'screening', 'media conference', 'film workshop', 'director Q&A', 'film panel', 'media expo', 'video game night', 'animation showcase'],
        'Art Events': ['art show', 'gallery opening', 'art class', 'sculpture exhibition', 'painting workshop', 'digital art showcase', 'mural unveiling', 'art auction', 'artist talk', 'art fair'],
        'Gaming Events': ['LAN party', 'game tournament', 'board game night', 'card game tournament', 'video game launch', 'gaming expo', 'eSports competition', 'gaming meetup', 'role-playing game night', 'cosplay event'],
        'Pet Events': ['dog show', 'pet adoption fair', 'pet costume contest', 'agility trial', 'pet expo', 'veterinary seminar', 'puppy playdate', 'pet training workshop', 'pet parade', 'animal rescue fundraiser'],
        'Networking Events': ['networking breakfast', 'industry mixer', 'speed networking', 'professional lunch', 'business after hours', 'career fair', 'mentor meetup', 'alumni gathering', 'online networking', 'networking reception'],
        'Seasonal Events': ['holiday bazaar', 'christmas market', 'easter egg hunt', 'summer fair', 'fall festival', 'winter wonderland', 'spring fling', 'halloween party', 'thanksgiving dinner', 'new year’s eve party'],
        'History Events': ['historical reenactment', 'museum tour', 'heritage walk', 'history lecture', 'archaeology dig', 'historical site visit', 'heritage festival', 'ancestry workshop', 'historical documentary screening', 'battlefield tour'],
        'Pop Culture Events': ['comic con', 'anime convention', 'fandom meetup', 'cosplay event', 'fan screening', 'pop culture expo', 'fan art exhibit', 'celebrity meet and greet', 'fan panel', 'meme festival'],
        'Hobby and Craft Events': ['knitting circle', 'quilting bee', 'craft fair', 'model building workshop', 'DIY workshop', 'scrapbooking event', 'woodworking class', 'hobby expo', 'maker faire', 'ceramics class'],
        'LGBTQ+ Events': ['pride parade', 'drag show', 'queer film festival', 'LGBTQ+ workshop', 'support group', 'LGBTQ+ dance', 'pride picnic', 'queer art show', 'LGBTQ+ conference', 'LGBTQ+ meetup'],
        'Fitness Events': ['5k run', 'cycling event', 'yoga retreat', 'fitness class', 'bodybuilding competition', 'fitness expo', 'spin class', 'zumba party', 'dance class', 'pilates session'],
        'Motor Events': ['car show', 'motorcycle rally', 'off-road race', 'auto expo', 'car meet', 'classic car show', 'drag race', 'karting event', 'motorcycle show', 'truck show'],
        'Boat Events': ['boat show', 'sailing regatta', 'yacht party', 'kayaking trip', 'canoe race', 'fishing tournament', 'sailing class', 'boat parade', 'maritime festival', 'cruise event'],
        'Air Events': ['air show', 'hot air balloon festival', 'aviation expo', 'skydiving event', 'paragliding trip', 'glider event', 'aerobatics show', 'drone race', 'helicopter tour', 'aviation conference'],
        'Animal Events': ['horse show', 'dog agility event', 'cat show', 'pet expo', 'wildlife tour', 'bird watching', 'zoo event', 'animal sanctuary tour', 'animal rescue event', 'veterinary seminar'],
        'Shopping Events': ['craft fair', 'flea market', 'swap meet', 'garage sale', 'vendor fair', 'market day', 'antique show', 'shopping festival', 'boutique sale', 'mall event'],
        'Home and Garden Events': ['garden tour', 'home show', 'flower show', 'gardening workshop', 'home improvement expo', 'landscape tour', 'garden party', 'plant sale', 'home decor fair', 'garden club meeting'],
        'Outdoor Events': ['camping trip', 'hiking adventure', 'nature walk', 'picnic', 'outdoor concert', 'beach party', 'bonfire night', 'star gazing', 'trail run', 'canoe trip'],
        'Holiday Events': ['christmas party', 'halloween celebration', 'easter egg hunt', 'thanksgiving dinner', 'new year’s eve bash', 'valentine’s day dance', '4th of july picnic', 'st. patrick’s day parade', 'holiday market', 'hanukkah celebration'],
        'Kids Events': ['storytime', 'puppet show', 'magic show', 'kids concert', 'children’s theater', 'kids craft', 'lego event', 'kids yoga', 'face painting', 'science for kids'],
        'Dance Events': ['dance recital', 'dance workshop', 'salsa night', 'ballroom dance', 'hip-hop dance', 'dance competition', 'ballet performance', 'dance party', 'folk dance', 'tango night'],
        'Comedy Events': ['stand-up comedy', 'improv show', 'comedy festival', 'open mic comedy', 'comedy night', 'sketch comedy', 'comedy competition', 'comedy class', 'comedy club', 'comedy podcast recording'],
        'Theater Events': ['play', 'musical', 'improv show', 'drama workshop', 'one-act play', 'theater festival', 'monologue night', 'reader’s theater', 'theater in the park', 'staged reading'],
        'Wellness Events': ['meditation workshop', 'yoga retreat', 'mindfulness seminar', 'wellness fair', 'holistic expo', 'reiki session', 'sound bath', 'wellness weekend', 'holistic workshop', 'detox retreat'],
        'Adventure Events': ['rock climbing', 'scuba diving', 'skydiving', 'paragliding', 'white water rafting', 'zip lining', 'caving', 'bungee jumping', 'safari', 'trekking'],
        'Science Fiction Events': ['sci-fi convention', 'futurism expo', 'sci-fi film screening', 'sci-fi book club', 'robotics expo', 'virtual reality event', 'sci-fi art show', 'cosplay contest', 'space talk', 'cyberpunk party']
    };
    
    const hashtags = {
        'Corporate Events': ['#Conference', '#Seminar', '#TradeShow', '#ProductLaunch', '#TeamBuilding', '#AGM', '#ShareholderMeeting', '#BusinessEvent', '#Corporate', '#Networking', '#BusinessMeeting', '#IndustryEvent', '#CorporateTraining', '#CompanyEvent'],
        'Social Events': ['#Wedding', '#Birthday', '#Anniversary', '#Graduation', '#Reunion', '#HolidayParty', '#Celebration', '#Party', '#SocialGathering', '#FamilyEvent', '#BabyShower', '#EngagementParty', '#Housewarming', '#BridalShower'],
        'Educational Events': ['#Workshop', '#Training', '#Webinar', '#Lecture', '#AcademicConference', '#Education', '#Learning', '#SkillDevelopment', '#ProfessionalDevelopment', '#StudyGroup', '#Tutoring', '#PanelDiscussion', '#OpenHouse', '#CollegeFair'],
        'Cultural Events': ['#Festival', '#ArtExhibition', '#Concert', '#Theater', '#FilmScreening', '#FashionShow', '#CulturalEvent', '#Arts', '#Performance', '#MusicFestival', '#HeritageCelebration', '#CulturalFair', '#PoetryReading', '#BookFair'],
        'Sports Events': ['#Tournament', '#Match', '#Race', '#SportingExhibition', '#SportsEvent', '#Athletics', '#Competition', '#GameDay', '#Championship', '#Marathon', '#Triathlon', '#FitnessChallenge', '#SportsClinic', '#EsportsTournament'],
        'Charity and Fundraising Events': ['#CharityGala', '#Auction', '#BenefitConcert', '#FundraisingDinner', '#CharityEvent', '#NonProfit', '#Philanthropy', '#GiveBack', '#Fundraiser', '#CharityWalk', '#CharityRun', '#Telethon', '#BakeSale', '#CarWash'],
        'Community Events': ['#StreetFair', '#Parade', '#FarmersMarket', '#BlockParty', '#CommunityEvent', '#LocalEvent', '#Neighborhood', '#PublicEvent', '#CommunityGathering', '#CommunityCleanup', '#NeighborhoodWatch', '#PublicForum', '#TownHall', '#Potluck'],
        'Political and Government Events': ['#PoliticalRally', '#TownHall', '#GovernmentConference', '#PoliticalEvent', '#CivicEngagement', '#PublicPolicy', '#GovernmentMeeting', '#Politics', '#Debate', '#VoterRegistration', '#PublicHearing', '#CampaignEvent', '#PolicyDiscussion', '#PressConference'],
        'Religious and Spiritual Events': ['#ChurchService', '#ReligiousFestival', '#SpiritualRetreat', '#ReligiousEvent', '#Faith', '#Spirituality', '#Worship', '#Prayer', '#ReligiousGathering', '#BibleStudy', '#YouthGroup', '#ChoirPractice', '#Revival', '#MissionTrip'],
        'Trade and Industry Events': ['#Exhibition', '#TradeFair', '#Expo', '#BusinessNetworking', '#IndustryEvent', '#TradeShow', '#Marketplace', '#TradeExhibition', '#ProductDemo', '#SalesMeeting', '#LaunchEvent', '#VendorFair', '#TechShowcase', '#IndustryConference'],
        'Music Events': ['#Concert', '#MusicFestival', '#OpenMic', '#BattleOfTheBands', '#ChoirConcert', '#OrchestraPerformance', '#JazzNight', '#DJSet', '#KaraokeNight', '#AlbumRelease', '#MusicEvent', '#LiveMusic', '#BandPerformance', '#ClassicalMusic'],
        'Food and Drink Events': ['#FoodFestival', '#WineTasting', '#BeerFestival', '#CookingClass', '#FoodTruckRally', '#RestaurantWeek', '#CulinaryTour', '#FarmToTable', '#Brunch', '#HappyHour', '#FoodEvent', '#Gourmet', '#Chef', '#Cuisine'],
        'Technology Events': ['#Hackathon', '#TechConference', '#CodingBootcamp', '#StartupPitch', '#AppLaunch', '#RoboticsCompetition', '#Cybersecurity', '#TechMeetup', '#Webinar', '#ITWorkshop', '#TechEvent', '#Innovation', '#GadgetShow', '#DevMeetup'],
        'Health and Wellness Events': ['#HealthFair', '#YogaClass', '#Meditation', '#FitnessBootcamp', '#NutritionWorkshop', '#WellnessRetreat', '#MentalHealth', '#WellnessExpo', '#GroupHike', '#SelfCare', '#HealthEvent', '#Fitness', '#WellBeing', '#HealthSeminar'],
        'Environmental Events': ['#CleanUpDrive', '#TreePlanting', '#RecyclingDrive', '#EnvironmentalWorkshop', '#Sustainability', '#EcoFair', '#NatureWalk', '#GreenLiving', '#ClimateChange', '#EarthDay', '#EnvironmentalEvent', '#EcoFriendly', '#GreenEvent', '#Nature'],
        'Travel and Adventure Events': ['#TravelExpo', '#AdventureRace', '#ScubaDiving', '#Hiking', '#Camping', '#Safari', '#RoadTrip', '#Cruise', '#PhotographyTour', '#TravelWorkshop', '#TravelEvent', '#Adventure', '#Explore', '#Wanderlust'],
        'Fashion Events': ['#FashionShow', '#TrunkShow', '#FashionWeek', '#StyleWorkshop', '#MakeupTutorial', '#RunwayShow', '#DesignerShowcase', '#FashionPopUp', '#BoutiqueOpening', '#WardrobeConsultation', '#FashionEvent', '#Style', '#Trendy', '#Fashionista'],
        'Literary Events': ['#BookSigning', '#AuthorReading', '#PoetrySlam', '#BookLaunch', '#LiteraryFestival', '#WritingWorkshop', '#Storytelling', '#BookClub', '#ZineFair', '#LibraryEvent', '#LiteraryEvent', '#Books', '#Literature', '#AuthorEvent'],
        'Family Events': ['#FamilyFunDay', '#KidsParty', '#PlayDate', '#FamilyReunion', '#ScavengerHunt', '#ChildrensTheater', '#FamilyGameNight', '#PettingZoo', '#ArtsAndCrafts', '#FamilyPicnic', '#FamilyEvent', '#FunForAll', '#FamilyActivity', '#FamilyOuting'],
        'Science Events': ['#ScienceFair', '#AstronomyNight', '#ScienceWorkshop', '#LabTour', '#STEMCamp', '#InnovationExpo', '#RoboticsWorkshop', '#ScienceFestival', '#TechTalk', '#ResearchSymposium', '#ScienceEvent', '#Discovery', '#Research', '#STEMEvent'],
        'Film and Media Events': ['#FilmFestival', '#MovieNight', '#Screening', '#MediaConference', '#FilmWorkshop', '#DirectorQA', '#FilmPanel', '#MediaExpo', '#VideoGameNight', '#AnimationShowcase', '#FilmEvent', '#Cinema', '#Media', '#FilmScreening'],
        'Art Events': ['#ArtShow', '#GalleryOpening', '#ArtClass', '#SculptureExhibition', '#PaintingWorkshop', '#DigitalArt', '#Mural', '#ArtAuction', '#ArtistTalk', '#ArtFair', '#ArtEvent', '#VisualArts', '#Creative', '#ArtGallery'],
        'Gaming Events': ['#LANParty', '#GameTournament', '#BoardGameNight', '#CardGame', '#VideoGame', '#GamingExpo', '#Esports', '#GamingMeetup', '#RolePlayingGame', '#CosplayEvent', '#GamingEvent', '#GameOn', '#TabletopGames', '#GameNight'],
        'Pet Events': ['#DogShow', '#PetAdoption', '#PetCostume', '#AgilityTrial', '#PetExpo', '#Veterinary', '#PuppyPlaydate', '#PetTraining', '#PetParade', '#AnimalRescue', '#PetEvent', '#AnimalLover', '#PetFriendly', '#FurBaby'],
        'Networking Events': ['#NetworkingBreakfast', '#IndustryMixer', '#SpeedNetworking', '#ProfessionalLunch', '#BusinessAfterHours', '#CareerFair', '#MentorMeetup', '#AlumniGathering', '#OnlineNetworking', '#NetworkingReception', '#NetworkingEvent', '#ProfessionalNetworking', '#BizNetwork', '#IndustryNetwork'],
        'Seasonal Events': ['#HolidayBazaar', '#ChristmasMarket', '#EasterEggHunt', '#SummerFair', '#FallFestival', '#WinterWonderland', '#SpringFling', '#HalloweenParty', '#ThanksgivingDinner', '#NewYearsEve', '#SeasonalEvent', '#Festive', '#HolidayEvent', '#SeasonalCelebration'],
        'History Events': ['#HistoricalReenactment', '#MuseumTour', '#HeritageWalk', '#HistoryLecture', '#Archaeology', '#HistoricalSite', '#HeritageFestival', '#Ancestry', '#DocumentaryScreening', '#BattlefieldTour', '#HistoryEvent', '#Historic', '#PastEvents', '#Heritage'],
        'Pop Culture Events': ['#ComicCon', '#AnimeConvention', '#FandomMeetup', '#Cosplay', '#FanScreening', '#PopCultureExpo', '#FanArt', '#CelebrityMeet', '#FanPanel', '#MemeFestival', '#PopCultureEvent', '#Fandom', '#GeekCulture', '#NerdLife'],
        'Hobby and Craft Events': ['#KnittingCircle', '#QuiltingBee', '#CraftFair', '#ModelBuilding', '#DIYWorkshop', '#Scrapbooking', '#Woodworking', '#HobbyExpo', '#MakerFaire', '#CeramicsClass', '#HobbyEvent', '#Crafts', '#DIY', '#Handmade'],
        'LGBTQ+ Events': ['#PrideParade', '#DragShow', '#QueerFilmFestival', '#LGBTQWorkshop', '#SupportGroup', '#LGBTQDance', '#PridePicnic', '#QueerArt', '#LGBTQConference', '#LGBTQMeetup', '#LGBTQEvent', '#Pride', '#LoveIsLove', '#Queer'],
        'Fitness Events': ['#5kRun', '#Cycling', '#YogaRetreat', '#FitnessClass', '#Bodybuilding', '#FitnessExpo', '#SpinClass', '#ZumbaParty', '#DanceClass', '#Pilates', '#FitnessEvent', '#HealthyLiving', '#Workout', '#GetFit'],
        'Motor Events': ['#CarShow', '#MotorcycleRally', '#OffRoadRace', '#AutoExpo', '#CarMeet', '#ClassicCar', '#DragRace', '#Karting', '#MotorcycleShow', '#TruckShow', '#MotorEvent', '#AutoEvent', '#CarEnthusiast', '#MotorSports'],
        'Boat Events': ['#BoatShow', '#SailingRegatta', '#YachtParty', '#Kayaking', '#CanoeRace', '#FishingTournament', '#SailingClass', '#BoatParade', '#MaritimeFestival', '#CruiseEvent', '#BoatEvent', '#OnTheWater', '#SailAway', '#BoatLovers'],
        'Air Events': ['#AirShow', '#HotAirBalloon', '#AviationExpo', '#Skydiving', '#Paragliding', '#Glider', '#Aerobatics', '#DroneRace', '#HelicopterTour', '#AviationConference', '#AirEvent', '#FlyingHigh', '#Aviation', '#SkyShow'],
        'Animal Events': ['#HorseShow', '#DogAgility', '#CatShow', '#PetExpo', '#WildlifeTour', '#BirdWatching', '#ZooEvent', '#AnimalSanctuary', '#AnimalRescue', '#Veterinary', '#AnimalEvent', '#AnimalLover', '#PetEvent', '#Wildlife'],
        'Shopping Events': ['#CraftFair', '#FleaMarket', '#SwapMeet', '#GarageSale', '#VendorFair', '#MarketDay', '#AntiqueShow', '#ShoppingFestival', '#BoutiqueSale', '#MallEvent', '#ShoppingEvent', '#ShopLocal', '#Bargain', '#VendorMarket'],
        'Home and Garden Events': ['#GardenTour', '#HomeShow', '#FlowerShow', '#GardeningWorkshop', '#HomeImprovement', '#LandscapeTour', '#GardenParty', '#PlantSale', '#HomeDecor', '#GardenClub', '#HomeGardenEvent', '#GreenThumb', '#Floral', '#HomeDesign'],
        'Outdoor Events': ['#CampingTrip', '#HikingAdventure', '#NatureWalk', '#Picnic', '#OutdoorConcert', '#BeachParty', '#BonfireNight', '#StarGazing', '#TrailRun', '#CanoeTrip', '#OutdoorEvent', '#Nature', '#Wild', '#GreatOutdoors'],
        'Holiday Events': ['#ChristmasParty', '#Halloween', '#EasterEggHunt', '#Thanksgiving', '#NewYearsEve', '#ValentinesDay', '#4thOfJuly', '#StPatricksDay', '#HolidayMarket', '#Hanukkah', '#HolidayEvent', '#FestiveSeason', '#HolidayCelebration', '#Seasonal'],
        'Kids Events': ['#Storytime', '#PuppetShow', '#MagicShow', '#KidsConcert', '#ChildrensTheater', '#KidsCraft', '#LegoEvent', '#KidsYoga', '#FacePainting', '#ScienceForKids', '#KidsEvent', '#FunForKids', '#KidFriendly', '#FamilyFun'],
        'Dance Events': ['#DanceRecital', '#DanceWorkshop', '#SalsaNight', '#BallroomDance', '#HipHopDance', '#DanceCompetition', '#Ballet', '#DanceParty', '#FolkDance', '#TangoNight', '#DanceEvent', '#Dance', '#Dancer', '#DancePerformance'],
        'Comedy Events': ['#StandUpComedy', '#ImprovShow', '#ComedyFestival', '#OpenMicComedy', '#ComedyNight', '#SketchComedy', '#ComedyCompetition', '#ComedyClass', '#ComedyClub', '#ComedyPodcast', '#ComedyEvent', '#Laughs', '#Funny', '#Humor'],
        'Theater Events': ['#Play', '#Musical', '#ImprovShow', '#DramaWorkshop', '#OneActPlay', '#TheaterFestival', '#MonologueNight', '#ReadersTheater', '#TheaterInThePark', '#StagedReading', '#TheaterEvent', '#Acting', '#StagePerformance', '#Drama'],
        'Wellness Events': ['#MeditationWorkshop', '#YogaRetreat', '#Mindfulness', '#WellnessFair', '#HolisticExpo', '#Reiki', '#SoundBath', '#WellnessWeekend', '#Holistic', '#DetoxRetreat', '#WellnessEvent', '#HealthyLiving', '#SelfCare', '#WellBeing'],
        'Adventure Events': ['#RockClimbing', '#ScubaDiving', '#Skydiving', '#Paragliding', '#WhiteWaterRafting', '#ZipLining', '#Caving', '#BungeeJumping', '#Safari', '#Trekking', '#AdventureEvent', '#ThrillSeeker', '#ExtremeSports', '#Adventure'],
        'Science Fiction Events': ['#SciFiConvention', '#Futurism', '#SciFiScreening', '#SciFiBookClub', '#RoboticsExpo', '#VirtualReality', '#SciFiArt', '#CosplayContest', '#SpaceTalk', '#Cyberpunk', '#SciFiEvent', '#Future', '#ScienceFiction', '#SciFi'] 
    };

    // Check title for keywords
    for (const category in categories) {
        const keywords = categories[category];
        if (keywords.some(keyword => titleLowerCase.includes(keyword))) {
            return { category, hashtags: hashtags[category] };
        }
    }
    

    // Check description for keywords if title didn't match
    for (const category in categories) {
        const keywords = categories[category];
        if (keywords.some(keyword => descriptionLowerCase.includes(keyword))) {
            return { category, hashtags: hashtags[category] };
        }
    }

    // Default to 'Uncategorized' if no category matches
    return { category: 'Uncategorized', hashtags: ['#Uncategorized'] };
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Import the array of links from the other file
const data = require('./insiderlinks');

// Function to scrape all URLs in the array
const scrapeAllUrls = async () => {
    let allData = [];

    for (const item of data) {
        const url = `https://insider.in${item.URL}`;
        const scrapedData = await scrapeWebsite(url);
        // Filter out empty objects
        if (scrapedData) {
            allData.push(scrapedData);
        }
    }

    // Save data to MongoDB
    if (allData.length > 0) {
        await Article.insertMany(allData.flat());
        console.log('Data scraped and saved successfully');
    } else {
        console.log('No valid data found');
    }
};

// API Endpoint to Scrape Data
app.get('/scrape', async (req, res) => {
    await scrapeAllUrls();
    res.json({ message: 'Scraping complete' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
