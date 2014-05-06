/* ***** BEGIN LICENCE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public Licence Version
 * 1.1 (the "Licence"); you may not use this file except in compliance with
 * the Licence. You may obtain a copy of the Licence at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the Licence
 * for the specific language governing rights and limitations under the
 * Licence.
 *
 * The Original Code is LeechBlock Add-on for Firefox.
 *
 * The Initial Developer of the Original Code is James Anderson.
 * Portions created by the Initial Developer are Copyright (C) 2007-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public Licence Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public Licence Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENCE BLOCK ***** */

/*
 * This file contains the code for handling browser-based events.
 */

// Array of flags to keep track of which block sets have had warnings displayed
var LeechBlock_doneWarning = [false, false, false, false, false, false];

// Create progress listener for detecting location change
var LeechBlock_progressListener = {
	QueryInterface: function(aIID) {
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
				aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
				aIID.equals(Components.interfaces.nsISupports)) {
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	},

	onLocationChange: function(aProgress, aRequest, aURI) {
		LeechBlock_onLocationChange(aProgress.DOMWindow);
	},

	onStateChange: function() {},
	onProgressChange: function() {},
	onStatusChange: function() {},
	onSecurityChange: function() {},
	onLinkIconAvailable: function() {}
};

// Handles browser loading
//
function LeechBlock_onLoad(event) {
	// Transfer password from preferences to Login Manager if necessary
	try {
		var password = LeechBlock_getCharPref("password");
		LeechBlock_storePassword(password);
		LeechBlock_clearUserPref("password");
	} catch (e) {
		// Nothing to do
	}

	// Convert old preferences if necessary
	LeechBlock_convertOldPreferences();

	// Add progress listener for this browser instance
	gBrowser.addProgressListener(LeechBlock_progressListener);

	// Apply preference for hiding safe-mode menu items
	var hsm = LeechBlock_getBoolPref("hsm");
	var helpSafeMode = document.getElementById("helpSafeMode");
	if (helpSafeMode != null) {
		helpSafeMode.hidden = hsm;
	}
	var appmenu_safeMode = document.getElementById("appmenu_safeMode");
	if (appmenu_safeMode != null) {
		appmenu_safeMode.hidden = hsm;
	}

	// Apply preference for hiding context menu
	var hcm = LeechBlock_getBoolPref("hcm");
	var contextMenu = document.getElementById("leechblock-context-menu");
	if (contextMenu != null) {
		contextMenu.hidden = hcm;
	}

	// Apply preference for hiding "Time Left" toolbar item
	LeechBlock_updateTimeLeft();

	// Check version and open version history page if new version
	if (LeechBlock_getCharPref("version") != LeechBlock_VERSION) {
		LeechBlock_setCharPref("version", LeechBlock_VERSION);
		gBrowser.selectedTab = gBrowser.addTab(LeechBlock_VERSION_HISTORY_URL);
	}

	// Get current time in seconds
	var now = Math.floor(Date.now() / 1000);

	for (var set = 1; set <= 6; set++) {
		// Reset time data if currently invalid
		var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
		if (timedata.length == 4) {
			timedata[5] = 0; // add lockdown end time (null)
		} else if (timedata.length != 5) {
			timedata = [now, 0, 0, 0, 0];
		}
		LeechBlock_setCharPref("timedata" + set, timedata.join(","));
	}

	// Get UTC timestamp in milliseconds
	var timestamp = Date.now();

	// Create HTTP request for sites for block set 1
	var sitesURL1 = LeechBlock_getUniCharPref("sitesURL1")
			.replace(/\$S/, "1").replace(/\$T/, timestamp);
	if (sitesURL1 != "") {
		try {
			var req1 = new XMLHttpRequest();
			req1.set = 1;
			req1.open("GET", sitesURL1, true);
			req1.onreadystatechange = function () {
				LeechBlock_httpRequestCallback(req1);
			};
			req1.send(null);
		} catch (e) {
			LeechBlock_printConsole("Cannot load sites from URL: " + sitesURL1);
		}
	}

	// Create HTTP request for sites for block set 2
	var sitesURL2 = LeechBlock_getUniCharPref("sitesURL2")
			.replace(/\$S/, "2").replace(/\$T/, timestamp);
	if (sitesURL2 != "") {
		try {
			var req2 = new XMLHttpRequest();
			req2.set = 2;
			req2.open("GET", sitesURL2, true);
			req2.onreadystatechange = function () {
				LeechBlock_httpRequestCallback(req2);
			};
			req2.send(null);
		} catch (e) {
			LeechBlock_printConsole("Cannot load sites from URL: " + sitesURL2);
		}
	}

	// Create HTTP request for sites for block set 3
	var sitesURL3 = LeechBlock_getUniCharPref("sitesURL3")
			.replace(/\$S/, "3").replace(/\$T/, timestamp);
	if (sitesURL3 != "") {
		try {
			var req3 = new XMLHttpRequest();
			req3.set = 3;
			req3.open("GET", sitesURL3, true);
			req3.onreadystatechange = function () {
				LeechBlock_httpRequestCallback(req3);
			};
			req3.send(null);
		} catch (e) {
			LeechBlock_printConsole("Cannot load sites from URL: " + sitesURL3);
		}
	}

	// Create HTTP request for sites for block set 4
	var sitesURL4 = LeechBlock_getUniCharPref("sitesURL4")
			.replace(/\$S/, "4").replace(/\$T/, timestamp);
	if (sitesURL4 != "") {
		try {
			var req4 = new XMLHttpRequest();
			req4.set = 4;
			req4.open("GET", sitesURL4, true);
			req4.onreadystatechange = function () {
				LeechBlock_httpRequestCallback(req4);
			};
			req4.send(null);
		} catch (e) {
			LeechBlock_printConsole("Cannot load sites from URL: " + sitesURL4);
		}
	}

	// Create HTTP request for sites for block set 5
	var sitesURL5 = LeechBlock_getUniCharPref("sitesURL5")
			.replace(/\$S/, "5").replace(/\$T/, timestamp);
	if (sitesURL5 != "") {
		try {
			var req5 = new XMLHttpRequest();
			req5.set = 5;
			req5.open("GET", sitesURL5, true);
			req5.onreadystatechange = function () {
				LeechBlock_httpRequestCallback(req5);
			};
			req5.send(null);
		} catch (e) {
			LeechBlock_printConsole("Cannot load sites from URL: " + sitesURL5);
		}
	}

	// Create HTTP request for sites for block set 6
	var sitesURL6 = LeechBlock_getUniCharPref("sitesURL6")
			.replace(/\$S/, "6").replace(/\$T/, timestamp);
	if (sitesURL6 != "") {
		try {
			var req6 = new XMLHttpRequest();
			req6.set = 6;
			req6.open("GET", sitesURL6, true);
			req6.onreadystatechange = function () {
				LeechBlock_httpRequestCallback(req6);
			};
			req6.send(null);
		} catch (e) {
			LeechBlock_printConsole("Cannot load sites from URL: " + sitesURL6);
		}
	}
}

// Handles browser unloading
//
function LeechBlock_onUnload(event) {
	// Remove progress listener for this browser instance
	gBrowser.removeProgressListener(LeechBlock_progressListener);
}

// Handles HTTP request callback
//
function LeechBlock_httpRequestCallback(req) {
	if (req.readyState == 4 && req.status == 200) {
		// Get sites from response text
		var sites = req.responseText.replace(/\s+/g, " ")
				.replace(/(^ +)|( +$)|(\w+:\/+)/g, "");

		// Get regular expressions to match sites
		var regexps = LeechBlock_getRegExpSites(sites);

		// Update preferences
		LeechBlock_setUniCharPref("sites" + req.set, sites);
		LeechBlock_setUniCharPref("blockRE" + req.set, regexps.block);
		LeechBlock_setUniCharPref("allowRE" + req.set, regexps.allow);
	}
}

// Handles location changing
//
function LeechBlock_onLocationChange(win) {
	//LeechBlock_printConsole("location: " + win.location + " " + win);

	// Get parsed URL for this page
	var parsedURL = LeechBlock_getParsedURL(win.location.href);

	// Only check page the first time (i.e. no check when tab re-activated)
	if (win.leechblockPageURL != parsedURL.page) {
		win.leechblockPageURL = parsedURL.page;
		LeechBlock_checkBlock(parsedURL, win, false);
	}

	LeechBlock_updateTimeLeft(win.leechblockSecsLeft);
}

// Handles page loading
//
function LeechBlock_onPageLoad(event) {
	//LeechBlock_printConsole("doc.load: " + event.target.location + " " + event.target);

	var doc = event.target;
	var win = doc.defaultView;

	// Get parsed URL for this page
	var parsedURL = LeechBlock_getParsedURL(win.location.href);

	// Clear preference for allowed host (unless this page is on allowed host)
	if (/^http|file|about/.test(parsedURL.protocol)
			&& parsedURL.host != LeechBlock_getUniCharPref("ah")) {
		LeechBlock_clearUserPref("ah");
	}

	// Hide extension in Add-ons Manager (if option selected)
	if (parsedURL.page == "about:addons" && LeechBlock_getBoolPref("ham")) {
		LeechBlock_hideLeechBlockExtension(doc);
	}

	// Check for internal block page
	if (parsedURL.protocol == "chrome" && parsedURL.host == "leechblock"
			&& parsedURL.args != null && parsedURL.args.length >= 2) {
		// Get block set and URL (including hash part) of blocked page
		var blockedSet = parsedURL.args.shift();
		var blockedURL = parsedURL.args.join("&");
		if (parsedURL.hash != null) {
			blockedURL += "#" + parsedURL.hash;
		}

		// Insert URL of blocked page
		var blockedURLSpan = doc.getElementById("lbBlockedURLSpan");
		if (blockedURLSpan != null) {
			if (blockedURL.length > 60) {
				blockedURLSpan.textContent = blockedURL.substring(0, 57) + "...";
			} else {
				blockedURLSpan.textContent = blockedURL;
			}
		}

		// Update name of block set
		var blockedSetSpan = doc.getElementById("lbBlockedSetSpan");
		if (blockedSetSpan != null) {
			var blockedSetName = LeechBlock_getUniCharPref("setName" + blockedSet);
			if (blockedSetName == "") {
				blockedSetSpan.textContent += " " + blockedSet;
			} else {
				blockedSetSpan.textContent = blockedSetName;
			}
		}

		// Update hyperlink to blocked page
		var clickHereLink = doc.getElementById("lbClickHereLink");
		if (clickHereLink != null) {
			clickHereLink.setAttribute("href", blockedURL);
		}

		if (parsedURL.pageNoArgs == LeechBlock_DELAYED_BLOCK_URL) {
			// Get delay value in seconds
			var delaySecs = LeechBlock_getCharPref("delaySecs" + blockedSet);

			// Update countdown seconds on page
			var secondsSpan = doc.getElementById("lbSecondsSpan");
			if (secondsSpan != null) {
				secondsSpan.textContent = delaySecs;
			}

			if (!win.leechblockCountdownStarted) {
				// Start countdown
				LeechBlock_countdownDelayedBlock(win, blockedURL, delaySecs);
				win.leechblockCountdownStarted = true;
			}
		}
	}

	// Start clocking time spent on this page
	var focus = (document.commandDispatcher.focusedWindow == win);
	LeechBlock_clockPageTime(doc, true, focus);

	doc.addEventListener("pagehide", LeechBlock_onPageUnload, false);
	doc.addEventListener("focus", LeechBlock_onPageFocus, false);
	doc.addEventListener("blur", LeechBlock_onPageBlur, false);
	//win.addEventListener("focus", LeechBlock_onWinFocus, false);
	//win.addEventListener("blur", LeechBlock_onWinBlur, false);

	// Only check page if not already checked on location change
	if (win.leechblockPageURL != parsedURL.page) {
		win.leechblockPageURL = parsedURL.page;
		LeechBlock_checkBlock(parsedURL, win, false);
	}
}

// Checks the URL of a window and applies block if necessary
//
function LeechBlock_checkBlock(parsedURL, win, isRepeat) {
	//LeechBlock_printConsole("check: " + win.location);

	// Quick exit for non-http/non-file/non-about URLs
	if (!/^(http|file|about)/.test(parsedURL.protocol)) {
		return;
	}

	// Quick exit for embedded pages (according to preference)
	if (win.frameElement != null && !LeechBlock_getBoolPref("bep")) {
		return;
	}

	// Quick exit for allowed host
	if (parsedURL.host == LeechBlock_getUniCharPref("ah")) {
		return;
	}

	// Get URL without hash part (unless it's a hash-bang part)
	var pageURL = parsedURL.page;
	if (parsedURL.hash != null && /^!/.test(parsedURL.hash)) {
		pageURL += "#" + parsedURL.hash;
	}

	// Get current time/date
	var timedate = new Date();

	// Get current time in seconds
	var now = Math.floor(Date.now() / 1000);

	win.leechblockSecsLeft = Infinity;

	for (var set = 1; set <= 6; set++) {
		// Get regular expressions for matching sites to block/allow
		var blockRE = LeechBlock_getUniCharPref("blockRE" + set);
		if (blockRE == "") continue; // no block for this set
		var allowRE = LeechBlock_getUniCharPref("allowRE" + set);

		// Get preference for active block
		var activeBlock = LeechBlock_getBitPref("activeBlock", set);

		// Get preferences for preventing access to about:addons and about:config
		var prevAddons = LeechBlock_getBitPref("prevAddons", set);
		var prevConfig = LeechBlock_getBitPref("prevConfig", set);

		// Test URL against block/allow regular expressions
		if (LeechBlock_testURL(pageURL, blockRE, allowRE)
				|| (prevAddons && /^about:addons/.test(pageURL))
				|| (prevConfig && /^about:config/.test(pageURL))) {
			// Get preferences for this set
			var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
			var times = LeechBlock_getCharPref("times" + set);
			var minPeriods = LeechBlock_getMinPeriods(times);
			var limitMins = LeechBlock_getCharPref("limitMins" + set);
			var limitPeriod = LeechBlock_getCharPref("limitPeriod" + set);
			var periodStart = LeechBlock_getTimePeriodStart(now, limitPeriod);
			var conjMode = LeechBlock_getBitPref("conjMode", set);
			var daySel = LeechBlock_decodeDays(LeechBlock_getIntPref("days" + set));
			var blockURL = LeechBlock_getUniCharPref("blockURL" + set);

			if (win.leechblockRepeatCheckPending == undefined) {
				// Start timer for repeat check
				setTimeout(LeechBlock_repeatCheckBlock,
						LeechBlock_getIntPref("repeatCheckPeriod"),
						win, pageURL);
				win.leechblockRepeatCheckPending = true;
			}

			// Check day
			var onSelectedDay = daySel[timedate.getDay()];

			// Check time periods
			var secsLeftBeforePeriod = Infinity;
			if (onSelectedDay && times != "") {
				// Get number of minutes elapsed since midnight
				var mins = timedate.getHours() * 60 + timedate.getMinutes();

				// Check each time period in turn
				for (var i in minPeriods) {
					if (mins >= minPeriods[i].start
							&& mins < minPeriods[i].end) {
						secsLeftBeforePeriod = 0;
					} else if (mins < minPeriods[i].start) {
						// Compute exact seconds before this time period starts
						var secs = (minPeriods[i].start - mins) * 60
								- timedate.getSeconds();
						if (secs < secsLeftBeforePeriod) {
							secsLeftBeforePeriod = secs;
						}
					}
				}
			}

			// Check time limit
			var secsLeftBeforeLimit = Infinity;
			if (onSelectedDay && limitMins != "" && limitPeriod != "") {
				// Compute exact seconds before this time limit expires
				secsLeftBeforeLimit = limitMins * 60;
				if (timedata.length == 5 && timedata[2] == periodStart) {
					var secs = secsLeftBeforeLimit - timedata[3];
					secsLeftBeforeLimit = Math.max(0, secs);
				}
			}

			var withinTimePeriods = (secsLeftBeforePeriod == 0);
			var afterTimeLimit = (secsLeftBeforeLimit == 0);

			// Check lockdown condition
			var lockdown = (timedata.length == 5 && timedata[4] > now);

			// Determine whether this page should now be blocked
			var doBlock = lockdown
					|| (!conjMode && (withinTimePeriods || afterTimeLimit))
					|| (conjMode && (withinTimePeriods && afterTimeLimit));

			// Redirect page if all relevant block conditions are fulfilled
			if (doBlock && (!isRepeat || activeBlock)) {

				// Get final URL for block page
				if (blockURL == LeechBlock_DEFAULT_BLOCK_URL
						|| blockURL == LeechBlock_DELAYED_BLOCK_URL) {
					blockURL = blockURL + "?" + set + "&" + pageURL;
				} else {
					blockURL = blockURL.replace(/\$U/, pageURL);
				}

				// Redirect page according to preference
				if (LeechBlock_getBoolPref("kpb")) {
					win.location = blockURL;
				} else {
					win.location.replace(blockURL);
				}

				return; // nothing more to do
			}

			// Update seconds left before block
			var secsLeft = conjMode
					? (secsLeftBeforePeriod + secsLeftBeforeLimit)
					: Math.min(secsLeftBeforePeriod, secsLeftBeforeLimit);
			if (secsLeft < win.leechblockSecsLeft) {
				win.leechblockSecsLeft = secsLeft;
				win.leechblockSecsLeftSet = set;
			}
		}
	}

	// Determine whether to display warning message
	var warnSecs = LeechBlock_getCharPref("warnSecs");
	if (warnSecs != "") {
		var set = win.leechblockSecsLeftSet;
		if (win.leechblockSecsLeft > warnSecs) {
			// Reset flag
			LeechBlock_doneWarning[set - 1] = false;
		} else if (!LeechBlock_doneWarning[set - 1]) {
			// Set flag
			LeechBlock_doneWarning[set - 1] = true;
			// Display warning message
			var setName = LeechBlock_getUniCharPref("setName" + set);
			LeechBlock_alertBlockWarning(set, setName, win.leechblockSecsLeft);
		}
	}
}

// Handles callback for repeat check
//
function LeechBlock_repeatCheckBlock(win, lastURL) {
	var doc = win.document;

	win.leechblockRepeatCheckPending = undefined;

	try {
		// Get parsed URL for this page
		var parsedURL = LeechBlock_getParsedURL(win.location.href);

		// Check again only if location has not changed
		if (parsedURL.page == lastURL) {
			// Force update of time spent on this page
			if (doc.leechblockFocusTime != undefined) {
				// Page is open and has focus
				LeechBlock_clockPageTime(doc, false, false);
				LeechBlock_clockPageTime(doc, true, true);
			} else {
				// Page is open but does not have focus
				LeechBlock_clockPageTime(doc, false, false);
				LeechBlock_clockPageTime(doc, true, false);
			}

			LeechBlock_checkBlock(parsedURL, win, true);

			// If page has focus, update time left
			if (doc.leechblockFocusTime != undefined) {
				LeechBlock_updateTimeLeft(win.leechblockSecsLeft);
			}
		}
	} catch (e) {
		// Die gracefully
	}
}

// Handles page unloading
//
function LeechBlock_onPageUnload(event) {
	//LeechBlock_printConsole("doc.unload: " + event.target.location + " " + event.target);

	var doc = event.target.ownerDocument != null
			? event.target.ownerDocument
			: event.target;

	// Stop countdown if this is delayed block page
	if (doc.leechblockTimeoutID != undefined) {
		clearTimeout(doc.leechblockTimeoutID);

		// Strike line through countdown text
		var countdownText = doc.getElementById("lbCountdownText");
		if (countdownText != null) {
			countdownText.style.textDecoration = "line-through";
		}
	}

	LeechBlock_clockPageTime(doc, false, false);
}

// Handles page gaining focus
//
function LeechBlock_onPageFocus(event) {
	//LeechBlock_printConsole("doc.focus: " + event.target.location + " " + event.target);

	var doc = event.target.ownerDocument != null
			? event.target.ownerDocument
			: event.target;

	LeechBlock_clockPageTime(doc, true, true);
}

// Handles page losing focus
//
function LeechBlock_onPageBlur(event) {
	//LeechBlock_printConsole("doc.blur: " + event.target.location + " " + event.target);

	var doc = event.target.ownerDocument != null
			? event.target.ownerDocument
			: event.target;

	// Stop countdown if this is delayed block page
	if (doc.leechblockTimeoutID != undefined) {
		clearTimeout(doc.leechblockTimeoutID);

		// Strike line through countdown text
		var countdownText = doc.getElementById("lbCountdownText");
		if (countdownText != null) {
			countdownText.style.textDecoration = "line-through";
		}
	}

	LeechBlock_clockPageTime(doc, true, false);
}

// Handles window gaining focus
//
function LeechBlock_onWinFocus(event) {
	//LeechBlock_printConsole("win.focus: " + event.target.location + " " + event.target);

	var win = event.target;
	var doc = win.document;

	if (doc != null) {
		LeechBlock_clockPageTime(doc, true, true);
	}
}

// Handles window losing focus
//
function LeechBlock_onWinBlur(event) {
	//LeechBlock_printConsole("win.blur: " + event.target.location + " " + event.target);

	var win = event.target;
	var doc = win.document;

	if (doc != null) {
		LeechBlock_clockPageTime(doc, true, false);
	}
}

// Clocks time spent on page
//
function LeechBlock_clockPageTime(doc, open, focus) {
	// Clock time during which page has been open
	var secsOpen = 0;
	if (open) {
		if (doc.leechblockOpenTime == undefined) {
			// Set start time for this page
			doc.leechblockOpenTime = Date.now();
		}
	} else {
		if (doc.leechblockOpenTime != undefined) {
			if (doc.location != null && /^(http|file)/.test(doc.location.href)) {
				// Calculate seconds spent on this page (while open)
				secsOpen = Math.round((Date.now() - doc.leechblockOpenTime) / 1000);
			}

			doc.leechblockOpenTime = undefined;
		}
	}

	// Clock time during which page has been focused
	var secsFocus = 0;
	if (focus) {
		if (doc.leechblockFocusTime == undefined) {
			// Set focus time for this page
			doc.leechblockFocusTime = Date.now();
		}
	} else {
		if (doc.leechblockFocusTime != undefined) {
			if (doc.location != null && /^(http|file)/.test(doc.location.href)) {
				// Calculate seconds spent on this page (while focused)
				secsFocus = Math.round((Date.now() - doc.leechblockFocusTime) / 1000);
			}

			doc.leechblockFocusTime = undefined;
		}
	}

	// Update time data if necessary
	if (secsOpen > 0 || secsFocus > 0) {
		var parsedURL = LeechBlock_getParsedURL(doc.location.href);
		LeechBlock_updateTimeData(parsedURL.page, secsOpen, secsFocus);
	}
}

// Updates data for time spent on page
//
function LeechBlock_updateTimeData(pageURL, secsOpen, secsFocus) {
	//LeechBlock_printConsole("updateTimeData: pageURL = " + pageURL);
	//LeechBlock_printConsole("updateTimeData: secsOpen = " + secsOpen);
	//LeechBlock_printConsole("updateTimeData: secsFocus = " + secsFocus);

	// Get current time/date
	var timedate = new Date();

	// Get current time in seconds
	var now = Math.floor(Date.now() / 1000);

	for (var set = 1; set <= 6; set++) {
		// Get regular expressions for matching sites to block/allow
		var blockRE = LeechBlock_getUniCharPref("blockRE" + set);
		if (blockRE == "") continue; // no block for this set
		var allowRE = LeechBlock_getUniCharPref("allowRE" + set);

		// Test URL against block/allow regular expressions
		if (LeechBlock_testURL(pageURL, blockRE, allowRE)) {
			// Get preferences for this set
			var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
			var countFocus = LeechBlock_getBitPref("countFocus", set);
			var times = LeechBlock_getCharPref("times" + set);
			var minPeriods = LeechBlock_getMinPeriods(times);
			var limitPeriod = LeechBlock_getCharPref("limitPeriod" + set);
			var conjMode = LeechBlock_getBitPref("conjMode", set);
			var daySel = LeechBlock_decodeDays(LeechBlock_getIntPref("days" + set));

			// Get start of this time period
			var periodStart = LeechBlock_getTimePeriodStart(now, limitPeriod);

			// Reset time data if currently invalid
			if (timedata.length != 5) {
				timedata = [now, 0, 0, 0, 0];
			}

			// Get number of seconds spent on page (focused or open)
			var seconds = countFocus ? secsFocus : secsOpen;

			// Update data for total time spent
			timedata[1] = +timedata[1] + seconds;

			// Determine whether we should count time spent on page in
			// specified time period (we should only count time on selected
			// days -- and in conjunction mode, only within time periods)
			var countTimeSpentInPeriod = daySel[timedate.getDay()];
			if (countTimeSpentInPeriod && conjMode) {
				countTimeSpentInPeriod = false;

				// Get number of minutes elapsed since midnight
				var mins = timedate.getHours() * 60 + timedate.getMinutes();

				// Check each time period in turn
				for (var i in minPeriods) {
					if (mins >= minPeriods[i].start
							&& mins < minPeriods[i].end) {
						countTimeSpentInPeriod = true;
					}
				}
			}

			// Update data for time spent in specified time period
			if (countTimeSpentInPeriod && periodStart > 0 && timedata[2] >= 0) {
				if (timedata[2] != periodStart) {
					// We've entered a new time period, so start new count
					timedata[2] = periodStart;
					timedata[3] = seconds;
				} else {
					// We haven't entered a new time period, so keep counting
					timedata[3] = +timedata[3] + seconds;
				}
				//LeechBlock_printConsole("Set " + set + ": " + timedata[3] + "s since " + new Date(timedata[2] * 1000).toLocaleString());
			}

			// Update preferences
			LeechBlock_setCharPref("timedata" + set, timedata.join(","));
		}
	}
}

// Updates "Time Left" toolbar item
//
function LeechBlock_updateTimeLeft(secsLeft) {
	var timeLeft = document.getElementById("leechblock-time-left");
	if (timeLeft == null) {
		return;
	}

	if (secsLeft == undefined || secsLeft == Infinity) {
		timeLeft.value = "--:--:--";
		timeLeft.style.backgroundColor = "#BBB";
		timeLeft.style.color = "#444";
		timeLeft.hidden = LeechBlock_getBoolPref("htl");
	} else {
		timeLeft.value = LeechBlock_formatTime(secsLeft);
		timeLeft.style.backgroundColor = "#FFF";
		timeLeft.style.color = "#000";
		timeLeft.hidden = false;
	}
}

// Handles countdown on delayed block page
//
function LeechBlock_countdownDelayedBlock(win, blockedURL, delaySecs) {
	var doc = win.document;
	var focus = (document.commandDispatcher.focusedWindow == win);

	// Update countdown seconds on page
	var secondsSpan = doc.getElementById("lbSecondsSpan");
	if (secondsSpan != null) {
		secondsSpan.textContent = delaySecs;
	}

	if (delaySecs > 0) {
		doc.leechblockTimeoutID = setTimeout(LeechBlock_countdownDelayedBlock,
				1000, win, blockedURL, focus ? (delaySecs - 1) : delaySecs);
	} else {
		// Get parsed URL for blocked page
		var parsedURL = LeechBlock_getParsedURL(blockedURL);

		// Set preference for allowed host
		LeechBlock_setUniCharPref("ah", parsedURL.host);

		// Continue to blocked page
		win.location = blockedURL;
	}
}

// Opens options dialog
//
function LeechBlock_openOptionsDialog() {
	window.openDialog("chrome://leechblock/content/options.xul",
			"leechblock-options", "chrome,centerscreen");
}

// Opens statistics dialog
//
function LeechBlock_openStatsDialog() {
	window.openDialog("chrome://leechblock/content/stats.xul",
			"leechblock-stats", "chrome,centerscreen");
}

// Opens lockdown dialog
//
function LeechBlock_openLockdownDialog() {
	window.openDialog("chrome://leechblock/content/lockdown.xul",
			"leechblock-lockdown", "chrome,centerscreen");
}

// Prepares menu (either context menu or toolbar menu)
//
function LeechBlock_prepareMenu(menu, win) {
	// Remove all menu items except last three
	while (menu.children.length > 3) {
		menu.removeChild(menu.firstChild);
	}

	// Get parsed URL for current page
	var parsedURL = LeechBlock_getParsedURL(win.location.href);

	// Quick exit for non-http URLs
	if (!/^http/.test(parsedURL.protocol)) {
		return;
	}

	// Get site name from URL
	var site = parsedURL.host.replace(/^www\./, "");

	// Add separator element
	var menuseparator = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"menuseparator");
	menu.insertBefore(menuseparator, menu.firstChild);

	// Add menu item for each block set
	for (var set = 1; set <= 6; set++) {
		// Get custom block set name (if specified)
		var setName = LeechBlock_getUniCharPref("setName" + set);

		// Create new menu item
		var menuitem = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"menuitem");
		menuitem.setAttribute("id", "leechblock-context-menuitem-addsite" + set);
		menuitem.setAttribute("label",
				LeechBlock_getAddSiteMenuItemLabel(site, set, setName));
		menuitem.site = site;
		menuitem.set = set;

		// Add menu item before separator
		menu.insertBefore(menuitem, menuseparator);
	}
}

// Adds site to block set
//
function LeechBlock_addSiteToSet(site, set) {
	if (site == undefined || set == undefined) {
		return;
	}

	// Get sites for this set
	var sites = LeechBlock_getUniCharPref("sites" + set);

	// Add site if not already included
	var patterns = sites.split(/\s+/);
	if (patterns.indexOf(site) < 0) {
		if (sites == "") {
			sites = site;
		} else {
			sites += " " + site;
		}

		// Get regular expressions to match sites
		var regexps = LeechBlock_getRegExpSites(sites);

		// Update preferences
		LeechBlock_setUniCharPref("sites" + set, sites);
		LeechBlock_setUniCharPref("blockRE" + set, regexps.block);
		LeechBlock_setUniCharPref("allowRE" + set, regexps.allow);

		LeechBlock_checkBlock(parsedURL, win, false);
	}
}

// Hides LeechBlock extension in Add-ons Manager
//
function LeechBlock_hideLeechBlockExtension(doc) {
	var lists = [
		"search-list",		// Search
		"addon-list",		// Extensions
		"updates-list",		// Recent Updates
	];

	for each (var list in lists) {
		var richlistbox = doc.getElementById(list);
		if (richlistbox != null) {
			var elements = richlistbox.getElementsByAttribute("value", LeechBlock_ID);
			for (var i = 0; i < elements.length; i++) {
				elements[i].hidden = true;
			}
		}
	}

	// Repeat! (list is repopulated whenever category selection is changed)
	setTimeout(LeechBlock_hideLeechBlockExtension, 200, doc);
}

// Add listeners for browser loading/unloading and page loading
window.addEventListener("load", LeechBlock_onLoad, false);
window.addEventListener("unload", LeechBlock_onUnload, false);
window.addEventListener("DOMContentLoaded", LeechBlock_onPageLoad, false);
