var streetvisions = (function ($) {
	
	'use strict';
	
	var _settings = {
		
		// CycleStreets API; obtain a key at https://www.cyclestreets.net/api/apply/
		apiBaseUrl: 'https://api.cyclestreets.net',
		apiKey: 'YOUR_API_KEY',
		
		// Mapbox API key
		mapboxApiKey: 'YOUR_MAPBOX_API_KEY',
		
		// Initial map location
		defaultLatitude: false,
		defaultLongitude: false,
		defaultZoom: false,
		
		// Tiles
		tileUrl: false,
		
		// Data
		geojsonData: {}
	}

	// Properties
	var _initialToolPosition = null; // Store the initial dragged position of a tool
	var _draggedToolType = null; // When dragging a tool in builder, store the tool type
	
	return {
		
	// Public functions
		
		// Main function
		initialise: function (config, action)
		{
			// Merge the configuration into the settings
			$.each (_settings, function (setting, value) {
				if (config.hasOwnProperty(setting)) {
					_settings[setting] = config[setting];
				}
			});
			
			// Run action, if defined and existing
			if (action) {
				if (typeof streetvisions[action] == 'function') {
					streetvisions[action] ();
				}
			}
		},
		
		
		// Function to initialise the UI
		schemeslist: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();

			// Search
			streetvisions.initSearch ();
		},
		
		
		visionshow: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();
			
			// Discussion
			streetvisions.initDiscussion ();
		},


		schemeshow: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();
			
			// Add a map with the specified data
			streetvisions.leafletMap (_settings.geojsonData);
		},
		
		
		visionadd: function ()
		{
			// Toolbox drawers
			streetvisions.toolbox ();

			// Builder options
			streetvisions.initBuilder ();
		},
		
		
		// Leaflet map
		leafletMap: function (geojsonData)
		{
			// Create a map
			var map = L.map ('map').setView ([_settings.defaultLatitude, _settings.defaultLongitude], _settings.defaultZoom);
			
			// Add tile background
			L.tileLayer (_settings.tileUrl, {
				attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
			}).addTo (map);
			
			// Add the GeoJSON to the map
			if (geojsonData) {
				var feature = L.geoJSON (geojsonData).addTo (map);
				map.fitBounds(feature.getBounds());
			}
		},
		
		
		// Segmented control
		segmentedControl: function ()
		{
			// Constants
			const SEGMENTED_CONTROL_BASE_SELECTOR = ".ios-segmented-control";
			const SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR = ".ios-segmented-control .option input";
			const SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR = ".ios-segmented-control .selection";
			
			forEachElement(SEGMENTED_CONTROL_BASE_SELECTOR, (elem) => {
				elem.addEventListener ('change', updatePillPosition);
			});
			window.addEventListener ('resize',
				updatePillPosition
			); // Prevent pill from detaching from element when window resized. Becuase this is rare I haven't bothered with throttling the event
			
			function updatePillPosition () {
				forEachElement (SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR, (elem, index) => {
					if (elem.checked) moveBackgroundPillToElement (elem, index);
				});
			}
		
			function moveBackgroundPillToElement (elem, index) {
				document.querySelector (SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR).style.transform = 'translateX(' + (elem.offsetWidth * index) + 'px)';
			}
			
			// Helper functions
			function forEachElement (className, fn) {
				Array.from (document.querySelectorAll (className)).forEach (fn);
			}
		},


		// Enable toolbox drawers
		toolbox: function ()
		{
			// Ensure correct default position
			$.each($('.toolbox-header'), function (indexInArray, toolboxHeader) {
				
				// If any of these are NOT set to be open
				if (!$(toolboxHeader).hasClass('toolbox-open')) {
					
					// Hide the contents
					$(toolboxHeader).find ('.group-contents').hide ();

					// Add chevron to the right >
					$(toolboxHeader).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(toolboxHeader).find ('.group-contents').show ();

					// Add down chevron, indicating open
					$(toolboxHeader).find ('i').removeClass ('rotated');
				}
			});

			// Enable toolbox headers to be clickable
			$('.toolbox-header>h5').on ('click', function (event) {
				toggleToolbox (event);
			});

			// Enable toolbox chevrons to be clickable
			$('.toolbox-header>i').on ('click', function (event) {
				toggleToolbox (event);
			});

			// Function to toggle a toolbox open or closed
			var toggleToolbox = function (event) {
				// Get current toolbox drawer status
				var toolboxHeader = $($(event.target)).closest ('.toolbox-header').first();
				var isOpen = $(toolboxHeader).hasClass ('toolbox-open');

				if (isOpen) {
					$(toolboxHeader).removeClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().addClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				} else {
					$(toolboxHeader).addClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().removeClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				}
				
			};

			// Display a toolbox card when the element is selected
			// !TODO having "read" the card once could be saved as a cookie, so the user doesn't have to constantly do this extra step to add map elements
			$('.toolbox .group-contents ul li').on ('click', function () {
				$('.toolbox-card').slideDown ();
			});

			// Enable the toolbox card to be closed
			$('.close-card').on ('click', function (){
				$('.toolbox-card').slideUp ();
			});

			// Initially, hide the toolbox popup
			$('.toolbox-card').hide ();
		},

	
		// Builder options
		initBuilder: function ()
		{
			// Start Leaflet
			var leafletMap = L.map('map').setView([51.505, -0.09], 13);
			L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
				attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
				maxZoom: 18,
				id: 'mapbox/streets-v11',
				tileSize: 512,
				zoomOffset: -1,
				accessToken: _settings.mapboxApiKey
			}).addTo(leafletMap);

			// Allow objects to be draggable onto the map
			$('.tool').draggable ({
				revert: 'invalid',
				stack: '#map',
				start: function (e, ui) {
					$('.tool').animate ({'opacity': 0.5})
					_initialToolPosition = $(this).offset();
				}
			});

			// Add map as droppable target
			$('#map').droppable({
				drop: function() {
					// Hide element
					$('.tool').animate ({'opacity': 0, 'width': 0, 'height': 0}, function () {
						// Return the ement to the box
						var {top, left} = _initialToolPosition;
						$('.tool').offset ({top, left});
						$('.tool').animate ({'opacity': 1, 'width': 100, 'height': 74});
					});

				}
			});
			
			// On drop on map, create an icon
			var mapdiv = document.getElementById("map")
			mapdiv.ondrop = function (e) {
				e.preventDefault()
				var coordinates = leafletMap.mouseEventToLatLng (e);
				L.marker(coordinates,
					{
						icon: L.icon({iconUrl: './images/waypoint.png'}),
						draggable: true
					})
				.addTo(leafletMap)
			}
			
			// When clicking on the title bar, make it editable
			$('.builder .map h2').on ('click', function (event){
				makeContentEditable (event.target);
				removeUntitledClass (event.target);
			});

			// When clicking on the description bar, make it editable
			$('.builder .map h4').on ('click', function (event){
				makeContentEditable (event.target);
				removeUntitledClass (event.target);
			});
			
			// Select and edit content
			var makeContentEditable = function (target) {
				$(target).attr('contenteditable','true');
				document.execCommand('selectAll',false,null);
			};

			// Remove untitled status
			var removeUntitledClass = function (target) {
				// Change the opacity to indicate action
				$(target).removeClass ('untitled');
			};
		},


		// Enable the discussion functionality
		initDiscussion: function ()
		{
			// Ensure correct default position
			$.each($('.discussion-header'), function (indexInArray, discussion) {
				
				// If any of these are NOT set to be open
				if (!$(discussion).hasClass('discussion-open')) {
					
					// Hide the contents
					$(discussion).find ('.answer').hide ();

					// Add chevron to the right >
					$(discussion).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(discussion).find ('.answer').show ();

					// Add down chevron, indicating open
					$(discussion).find ('i').removeClass ('rotated');
				}
			});

			// Enable discussion headers to be clickable
			$('.discussion-header>h5').on ('click', function (event) {
				toggleDiscussion (event);
			});

			// Enable discussion chevrons to be clickable
			$('.discussion-header>i').on ('click', function (event) {
				toggleDiscussion (event);
			});

			// Function to toggle a discussion open or closed
			var toggleDiscussion = function (event) {
				// Get current discussion drawer status
				var discussionHeader = $($(event.target)).closest ('.discussion-header').first();
				var isOpen = $(discussionHeader).hasClass ('discussion-open');

				if (isOpen) {
					$(discussionHeader).removeClass ('discussion-open');
					$(discussionHeader).find ('i').first ().addClass ('rotated');
					$(discussionHeader).find ('.answer').first ().slideToggle ();
				} else {
					$(discussionHeader).addClass ('discussion-open');
					$(discussionHeader).find ('i').first ().removeClass ('rotated');
					$(discussionHeader).find ('.answer').first ().slideToggle ();
				}
			};

			// Enable a new discussion to be created (display new discussion modal)
			$('.new-topic').on ('click', function () {
				$('.newDiscussion').show ();
			});

			// Close modal
			$('.closeModal').on ('click', function () {
				$('.newDiscussion').slideToggle ();
			});
		},

		
		// Initialise the search box
		initSearch: function ()
		{
			$('#search').on ('keyup', function () {
				var value = $(this).val ().toLowerCase ();
				$('.schemes ul li').filter (function () {
					$(this).toggle ($(this).text ().toLowerCase ().indexOf (value) > -1);
				});
			});
		}
	};
	
} (jQuery));
