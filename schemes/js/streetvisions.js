// Streetvisions implementation code

/*jslint browser: true, white: true, single: true, for: true, long: true */
/*global $, alert, console, window, jQuery, L, Tipped */

var streetvisions = (function ($) {
	
	'use strict';
	
	var _settings = {
		
		// CycleStreets API; obtain a key at https://www.cyclestreets.net/api/apply/
		apiBaseUrl: 'https://api.cyclestreets.net',
		apiKey: 'YOUR_API_KEY',
		
		// Initial map location
		defaultLatitude: false,
		defaultLongitude: false,
		defaultZoom: false,
		
		// Tiles
		tileUrl: false,
		
		// Data
		geojsonData: {}
	};

	// Properties
	var _initialToolPosition = null; // Store the initial dragged position of a tool
	var _draggedTool = null; // Div of the tool being dragged
	var _draggedToolObject = null; // Object containing information about the tool being dragged
	var _leafletMap; // Class property leaflet map
	var _leafletMarkers = []; // User-added map markers
	var toolboxObjects = [
		{
			type: 'cycleParking', 
			description: 'A parking area for bicycles.',
			groups: 'cycling',
			icon: 'fa-parking',
			colour: '#3BA735'
		},
		{
			type: 'seating', 
			description: 'Public outdoor seating, like a bench or seat.',
			groups: 'walking',
			icon: 'fa-chair'
		},
		{
			type: 'parklet', 
			description: 'A parklet is a sidewalk extension that provides more space and amenities for people using the street. Usually parklets are installed on parking lanes and use several parking spaces. Parklets typically extend out from the sidewalk at the level of the sidewalk to the width of the adjacent parking space.',
			groups: 'walking',
			icon: 'fa-tree'
		},
		{
			type: 'cycleLane', 
			description: 'A lane for bicycles.',
			groups: 'cycling',
			icon: 'fa-road'
		},
		{
			type: 'pointClosure', 
			description: 'Stop through-traffic to open up the space for cycling and walking',
			groups: ['driving', 'cycling'],
			icon: 'fa-hand-paper'
		},
		{
			type: 'carParking', 
			description: 'Parking space or spaces for cars.',
			groups: 'driving',
			icon: 'fa-parking'
		},
		{
			type: 'deliveryBay', 
			description: 'A delivery bay is a space where delivery vehicles can temporarily park while engaging in deliveries, without blocking the pavement.',
			groups: ['driving', 'walking'],
			icon: 'fa-parking',
			colour: '#0D6FBE'
		},
		{
			type: 'chargingPoint', 
			description: 'A charging station for vehicles.',
			groups: ['cycling', 'driving'],
			icon: 'fa-truck-loading',
			colour: '#4D3BAB'
		},
		{
			type: 'trafficCalming', 
			description: 'A device like a road hump, that causes traffic to slow.',
			groups: 'driving',
			icon: 'fa-traffic-light'
		},
		{
			type: 'plantingArea', 
			description: 'Small area for greenery',
			groups: ['walking', 'nature'],
			icon: 'fa-seedling'
		},
		{
			type: 'tree',
			description: '',
			groups: ['walking', 'nature'],
			icon: 'fa-tree',
			colour: '#2B8732'
		},
		{
			type: 'pavementImprovement', 
			description: '',
			groups: 'pedestrians',
			icon: 'fa-walking'
		},
		{
			type: 'crossing', 
			description: 'Pedestrian crossing',
			groups: 'pedestrians',
			icon: 'fa-traffic-light'
		},
		{
			type: 'playArea', 
			description: '',
			groups: 'pedestrians',
			icon: 'fa-snowman'
		},
		{
			type:'cafeSpace', 
			description: 'External seating and tables for nearby café/restaurant.',
			groups: 'walking',
			icon: 'fa-coffee'
		},
		{
			type: 'parkingRestriction', 
			description: '',
			groups: 'driving',
			icon: 'fa-parking'
		},
		{
			type: 'bollard', 
			description: '',
			groups: ['driving', 'cycling'],
			icon: 'fa-car-crash',
			colour: '#862EB2'
		},
		{
			type: 'disabledParking', 
			description: 'A specially reserved parking space.',
			groups: 'driving',
			icon: 'fa-parking'
		}
	];

	
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
				if (typeof streetvisions[action] === 'function') {
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

			// Map
			streetvisions.initLeaflet ('leaflet');
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
			// Init modal
			streetvisions.initModal ();
			
			// Add toolbox objects from defintion
			streetvisions.populateToolbox ();
			
			// Toolbox drawers
			streetvisions.toolbox ();

			// Builder options
			streetvisions.initBuilder ();
		},
		
		
		// Leaflet map
		leafletMap: function (geojsonData)
		{
			// Create a map
			var map = L.map ('leaflet').setView ([_settings.defaultLatitude, _settings.defaultLongitude], _settings.defaultZoom);
			
			// Add tile background
			L.tileLayer (_settings.tileUrl, {
				attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
			}).addTo (map);

			// Add a layer group to manage dropped tools
			L.layerGroup().addTo(map);
			
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
			
			forEachElement (SEGMENTED_CONTROL_BASE_SELECTOR, function (elem) {
				elem.addEventListener ('change', updatePillPosition);
			});
			window.addEventListener ('resize',
				updatePillPosition
			); // Prevent pill from detaching from element when window resized. Becuase this is rare I haven't bothered with throttling the event
			
			function updatePillPosition () {
				forEachElement (SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR, function (elem, index) {
					if (elem.checked) {
						moveBackgroundPillToElement (elem, index);
					}
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


		populateToolbox: function ()
		{
			// Iterate through each of the toolbox objects
			var html;
			var toolboxGroup;
			var toolboxOpen;
			var toolboxPrettyName;			
			toolboxObjects.map (function (tool, i) {
				
				// If groups is a string, convert it into an array
				var groups = (!Array.isArray (tool.groups) ? [tool.groups] : tool.groups);
				
				// Iterate through the groups
				groups.map (function (group) {
					toolboxGroup = $('.toolbox .' + group);
					toolboxPrettyName = streetvisions.capitalizeFirstLetter (group);
					
					// If there is no toolbox-header for this group, add it. 
					if (toolboxGroup.length === 0) {
						// If this is the first toolbox group, have it open by default
						toolboxOpen = ($('.toolbox-header').length == 0 ? 'toolbox-open' : '');
						
						// Build the HTML for the toolbox drawer
						html = '';
						html += `<div class="toolbox-header ${group} ${toolboxOpen}">`;
						html += '<i class="fa fa-chevron-down"></i>';
						html +=	`<h5>${toolboxPrettyName}</h5>`;
						html += '<div class="group-contents"><ul></ul></div></div>';
	
						// Add this to the toolbox 
						$('div.toolbox').append(html);
					}
					
					// Add this tool to the existing header
					var toolboxGroupUl = $('.toolbox .' + group + ' ul');
					var style = getColourCSS (i, toolboxObjects.length);
					var toolPrettyName = streetvisions.convertCamelCaseToSentence (tool.type);
					$(toolboxGroupUl).append (
						`<li data-tool="${tool.type}" style="background-color: ${style}; color: white;"><i class="fa ${tool.icon}"></i><p>${toolPrettyName}</p></li>`
					);
				});
			});

			// Generate random colour for tools
			function getColourCSS (i, length) {
				const randomInt = function (min, max) {
					return Math.floor(Math.random() * (max - min + 1)) + min;
				};
				var h = randomInt(0, 360);
				var s = randomInt(42, 98);
				var l = randomInt(30, 50);
				return `hsl(${h},${s}%,${l}%)`;
			}
		},


		capitalizeFirstLetter: function (string) 
		{
			return string.charAt(0).toUpperCase() + string.slice(1);
		},


		convertCamelCaseToSentence: function (string){
			return (string
				.replace(/^[a-z]|[A-Z]/g, function(v, i) {
					return (i === 0 ? v.toUpperCase() : " " + v.toLowerCase());
				})
			);
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
			// Enable the toolbox card to be closed
			$('.close-card').on ('click', function (){
				hideHelpCard ();
			});

			// Initially, hide the toolbox popup
			$('.toolbox-card').hide ();

			// Hide help card
			function hideHelpCard () {
				$('.toolbox-card').slideUp ();
			}

			// Open help card
			function openHelpCard () {
				$('.toolbox-card').slideDown ();
			}
			
			// Populate help card
			function populateHelpCard (type) {
				var object = toolboxObjects.find ((o) => o.type === type);

				if (object == 'undefined') {
					return false;
				}
				
				// Populate card
				$('.toolbox-card i.icon').removeClass().addClass('icon fa').addClass(object.icon);
				$('.toolbox-card h1').text(streetvisions.convertCamelCaseToSentence(object.type));
				$('.toolbox-card p').text(object.description);
			}

			// When clicking a tool, populate the help box
			$('.toolbox .group-contents ul li').on ('click', function () {
				var toolType = $(this).data('tool');
				if (!toolType) {
					hideHelpCard();
					return;
				}
				populateHelpCard (toolType);
				openHelpCard ();
			});
		},


		// Initiate a Leaflet map
		initLeaflet: function (element)
		{
			_leafletMap = L.map(element).setView([51.505, -0.09], 16);
			L.tileLayer (_settings.tileUrl, {
				attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
				maxZoom: 18,
				id: 'mapbox/streets-v11',
				tileSize: 512,
				zoomOffset: -1
			}).addTo(_leafletMap);
		},

	
		// Builder options
		initBuilder: function ()
		{
			// Start Leaflet
			streetvisions.initLeaflet('leaflet');

			// Allow objects to be draggable onto the map
			$('.toolbox .group-contents ul li').draggable ({
				revert: 'invalid',
				stack: '#leaflet',
				start: function (e, ui) {
					// Disable the help indicator as user has now dragged onto map
					$('.leafletInstructions').addClass ('hidden');
					
					// Store the toolname
					_draggedTool = $(this);
					var tool = $(this).data('tool');
					_draggedToolObject = toolboxObjects.find ((o) => (o.type === tool));
					_draggedToolObject.colour = $(this).css('background-color');
					
					// Add dragging style
					$(this).animate ({'opacity': 0.5});
					
					// Save initial position, to be used to return the item to this position when it's dropped
					_initialToolPosition = $(this).offset();
				},
				stop: function () {
					// Add dragging style
					$(this).animate ({'opacity': 1});
				}
			});

			// Add map as droppable target
			$('#leaflet').droppable({
				drop: function() {
					// Hide element
					$(_draggedTool).animate ({'opacity': 0}, function () {
						// Return the element to the box
						var top = _initialToolPosition[0];
						var left = _initialToolPosition[1];
						$(_draggedTool).animate ({'opacity': 1});
						$(_draggedTool).offset ({top, left});
					});
				}
			});
			
			// Template for the FontAwesome icon to drop onto map
			var fontAwesomeIcon = function () {
				// Get icon of tool that is currently being dragged
				var icon = _draggedToolObject.icon;
				var colour = _draggedToolObject.colour;

				return L.divIcon({
					html: `
					<span class="fa-stack fa-2x">
  						<i class="fas fa-map-marker fa-stack-2x" style="color: ${colour}"></i>
  						<i class="fa ${icon} fa-stack-1x" style="color: white"></i>
					</span>
					`,
					iconSize: [20, 20],
					iconAnchor: L.point(41, 62),
					className: 'leafletFontAwesomeIcon'
				});
			};

			// Check the bounds of a leaflet marker, return bool in/out box
			const checkBounds = function (marker, northEast, southWest) {
    			var bounds = new L.LatLngBounds(
					new L.LatLng(northEast[0], northEast[1]),
					new L.LatLng(southWest[0], southWest[1])
				);
				var markerPosition = marker.getLatLng();
				return bounds.contains(new L.LatLng(markerPosition.lat, markerPosition.lng));
			};
			
			// On drop on map, create an icon
			// Also, create the drag handler for the marker
			var mapdiv = document.getElementById('leaflet');
			mapdiv.ondrop = function (e) {
				e.preventDefault();
				var coordinates = _leafletMap.mouseEventToLatLng (e);
				var id = Date.now().toString();
				var marker = L.marker (coordinates, {
					icon: fontAwesomeIcon(),
					draggable: true,
					uniqueId: id
				});
				
				marker.on('move', function (event) {
					var bounds = _leafletMap.getBounds();
					var northEast = [bounds._northEast.lat-0.001, bounds._northEast.lng-0.001];
					var southWest = [bounds._southWest.lat-0.001, bounds._southWest.lng-0.001];
					if (!checkBounds (marker, northEast, southWest)) {
						$(this._icon).fadeOut(150, function () {
							_leafletMap.removeLayer (marker);
						});
					}
					
					var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == id));
					_leafletMarkers[markerKey].latLng = [marker._latlng.lat, marker._latlng.lng];
				});
				
				// On drop, show a modal to add description to this marker
				// !TODO check if this is actually one of our toolbox elements being dropped?
				var htmlContent = '<h1><i class="fa fa-hard-hat" style="color: #f2bd54"></i> New marker</h1>';
				htmlContent += '<hr>';
				htmlContent += '<p>Please describe the element you just added:</p>';
				htmlContent += '<textarea class="description" placeholder="This element improves the community by..." rows="4"></textarea>';
				htmlContent += `<a class="button button-general close-popup" data-new="true" data-id="${id}" href="#">Save</a>`;
			
				marker.addTo(_leafletMap);

				
				// Add custom class to this marker
				$(marker._icon).addClass(id);
				
				// Store this marker
				_leafletMarkers.push({
					object: _draggedToolObject,
					'id': id
				});
				
				// Update the marker object with current coordinates
				var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == id));
				_leafletMarkers[markerKey].latLng = [marker._latlng.lat, marker._latlng.lng];
				
				Tipped.create('.' + id, htmlContent, {skin: 'light', hideOn: false, padding: '20px', size: 'huge', offset: { x: 30, y: 0 }});
				Tipped.show('.' + id);
			};

			// When clicking close on a popup box, save the details
			$(document).on('click', '.close-popup', function (event) {
				var objectId = $(this).data('id');
				var description = $(this).siblings('.description').first().val();
				
				var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == objectId));
				_leafletMarkers[markerKey].description = description;

				Tipped.hide('.' + objectId);
				
				// If this was a first-time popup, delete it and add a normal one without the "New marker" title
				if ($(this).data('new')){
					Tipped.remove('.' + objectId);
					var typeOfObject = streetvisions.convertCamelCaseToSentence(_leafletMarkers[markerKey].object.type);
					var html = '';
					html += `<h1><i class="fa fa-hard-hat" style="color: #f2bd54"></i> ${typeOfObject}</h1>`;
					html += '<hr>';
					html += '<p>To edit this marker, please write in the box below:</p>';
					html += `<textarea class="description" rows="4">${description}</textarea>`;
					html += `<a class="button button-general close-popup" data-new="false" data-id="${objectId}" href="#">Save</a>`;
					Tipped.create('.' + objectId, html, {skin: 'light', size: 'huge', offset: { x: 30, y: 0 }});
				}
			});
			
			// When clicking on the title bar, make it editable
			$('.builder .title h2, .builder .title h4, .builder p.description').on ('click', function (event){
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

			// When clicking publish button, check if all fields have been filled in
			$('.publish').on('click', function () {
				// Check if all fields have been filled out
				var canPublish = true;
				$.each($('.required'), function (indexInArray, textElement) {
					if ($(textElement).text().includes('Click to add')) {
						canPublish = false;
					}
					if (!canPublish) {return;}
				});

				// If all fields aren't filled out, don't publish
				if (!canPublish) {
					streetvisions.showModal ({
						text: '<i class="fa fa-exclamation"></i> Oops...',
						description: "It seems you haven't filled out all the information we need for this vision yet. Please check you have filled out the title, description, and FAQ questions."
					});
					return;
				}

				// Gather the textual data into an object
				var faq = [];
				$.each ($('.question'), function (indexInArray, object) {
					faq.push ({
						question: $(object).find('h4').first().text(),
						answer: $(object).find('p').first().text()
					});
				});
				var textualData = {
					visionTitle: $('.title h2').text(),
					visionDescription: $('.title h4').text(),
					visionFAQ: faq
				};

				var geojsonFeatures = {
					type: 'FeatureCollection',
					features: _leafletMarkers.map ((marker) => (
						{
							type: 'Feature',
							properties: {
								description: marker.description,
								type: marker.object.type
							},
							geometry: {
								type: 'Point',
								coordinates: [marker.latLng[1], marker.latLng[0]]
							}
						}
					))
				};
				
				// Populate hidden form with stringified object
				var stringifiedJson = JSON.stringify(textualData);
				var stringifiedGeoJsonFeatures = JSON.stringify(geojsonFeatures);
				
				$('#builderDataObject').attr('value', stringifiedJson);
				$('#geojsonFeatures').attr('value', stringifiedGeoJsonFeatures);
			});
		},


		// Function to display a modal
		showModal: function (modalObject, htmlContent = false, onClick = false)
		{
			if (modalObject) {
				$('.modalBackground h1').html(modalObject.text);
				$('.modalBackground p').text(modalObject.description);
			} else {
				$('.modalContent .innerContent').html (htmlContent);
			}
			
			if (onClick) {
				$(document).on ('click', '.modal .ok-button', function () {
					onClick();
				});
			}

			$('.modalBackground').show();
		},
		
		
		initModal: function ()
		{
			$('.modal .button').on ('click', function () {
				$('.modalBackground').hide();
			});
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

			// Handler for creating new discussion topic
			const handleNewDiscussion = function () {
				// Get new discussion topic
				var newTopic = $('.newTopicTitle').val();
				$('.modalBackground').hide();
			};
			
			// Enable a new discussion to be created (display new discussion modal)
			$('.new-topic').on ('click', function () {
				var htmlContent = '<h1><i class="fa fa-plus-circle"></i> New discussion</h1>';
				htmlContent += '<hr>';
				htmlContent += '<p>Please enter a short topic title for this discussion:</p>';
				htmlContent += '<input class="newTopicTitle" placeholder="New topic..." />';
				streetvisions.showModal(false, htmlContent, handleNewDiscussion);
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
