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
 * This file contains the code for the Options dialog.
 */

const LeechBlock_ALL_DAY_TIMES = "0000-2400";

// Handles options dialog initialization
//
function LeechBlock_optionsInit() {
	// Get current time/date
	var timedate = new Date();

	// Get current time in seconds
	var now = Math.floor(Date.now() / 1000);

	// Get password
	try {
		var password = LeechBlock_retrievePassword();
	}
	catch (e) {
		// Close options dialog
		window.close();
		return;
	}
	document.getElementById("lb-options-password").value = password;

	// Get access preferences
	var oa = LeechBlock_getIntPref("oa");
	var hpp = LeechBlock_getBoolPref("hpp");
	document.getElementById("lb-options-access").value = oa;
	document.getElementById("lb-options-hpp").checked = hpp;
	LeechBlock_updatePasswordOptions();

	// Ask for password (if required)
	if (oa == 1 && password != "" && password != LeechBlock_requestPassword(hpp)) {
		// Close options dialog
		window.close();
		return;
	}

	// Ask for access code (if required)
	if (oa >= 2 && oa <= 4) {
		// Create random access code
		var code = LeechBlock_createAccessCode(8 << oa);
		// Get active window
		var awin = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
				.getService(Components.interfaces.nsIWindowWatcher).activeWindow;
		// Open dialog for user to enter code (centred on active window)
		var usercode = { value: null };
		awin.openDialog("chrome://leechblock/content/accesscode.xul",
				"lb-accesscode", "chrome,centerscreen,dialog,modal",
				code, usercode);
		if (code != usercode.value) {
			// Close options dialog
			window.close();
			return;
		}
	}

	// Check whether a lockdown is currently active
	for (var set = 1; set <= 6; set++) {
		var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
		var lockdown = (timedata.length == 5 && timedata[4] > now);
		if (lockdown) {
			// Enable 'Cancel Lockdown' button
			document.getElementById("lb-cancel-lockdown" + set).disabled = false;
			break;
		}
	}

	// Check whether access to options should be prevented
	for (var set = 1; set <= 6; set++) {
		if (LeechBlock_getBitPref("prevOpts", set)) {
			// Get preferences
			var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
			var times = LeechBlock_getCharPref("times" + set);
			var minPeriods = LeechBlock_getMinPeriods(times);
			var limitMins = LeechBlock_getCharPref("limitMins" + set);
			var limitPeriod = LeechBlock_getCharPref("limitPeriod" + set);
			var periodStart = LeechBlock_getTimePeriodStart(now, limitPeriod);
			var conjMode = LeechBlock_getBitPref("conjMode", set);
			var daySel = LeechBlock_decodeDays(LeechBlock_getIntPref("days" + set));

			// Check day
			var onSelectedDay = daySel[timedate.getDay()];

			// Check time periods
			var withinTimePeriods = false;
			if (onSelectedDay && times != "") {
				// Get number of minutes elapsed since midnight
				var mins = timedate.getHours() * 60 + timedate.getMinutes();

				// Check each time period in turn
				for (var i in minPeriods) {
					if (mins >= minPeriods[i].start
							&& mins < minPeriods[i].end) {
						withinTimePeriods = true;
					}
				}
			}

			// Check time limit
			var afterTimeLimit = false;
			if (onSelectedDay && limitMins != "" && limitPeriod != "") {
				// Check time data validity, time period, and time limit
				if (timedata.length == 5
						&& timedata[2] == periodStart
						&& timedata[3] >= (limitMins * 60)) {
					afterTimeLimit = true;
				}
			}

			// Check lockdown condition
			var lockdown = (timedata.length == 5 && timedata[4] > now);

			// Disable options if specified block conditions are fulfilled
			if (lockdown
					|| (!conjMode && (withinTimePeriods || afterTimeLimit))
					|| (conjMode && (withinTimePeriods && afterTimeLimit))) {
				// Disable options for this set
				LeechBlock_disableSetOptions(set);
			}
		}
	}

	for (var set = 1; set <= 6; set++) {
		// Get preferences
		var setName = LeechBlock_getUniCharPref("setName" + set);
		var sites = LeechBlock_getUniCharPref("sites" + set);
		sites = sites.replace(/\s+/g, "\n");
		var sitesURL = LeechBlock_getUniCharPref("sitesURL" + set);
		var activeBlock = LeechBlock_getBitPref("activeBlock", set);
		var prevOpts = LeechBlock_getBitPref("prevOpts", set);
		var prevAddons = LeechBlock_getBitPref("prevAddons", set);
		var prevConfig = LeechBlock_getBitPref("prevConfig", set);
		var countFocus = LeechBlock_getBitPref("countFocus", set);
		var delaySecs = LeechBlock_getCharPref("delaySecs" + set);
		var times = LeechBlock_getCharPref("times" + set);
		var limitMins = LeechBlock_getCharPref("limitMins" + set);
		var limitPeriod = LeechBlock_getCharPref("limitPeriod" + set);
		var conjMode = LeechBlock_getBitPref("conjMode", set);
		var daySel = LeechBlock_decodeDays(LeechBlock_getIntPref("days" + set));
		var blockURL = LeechBlock_getUniCharPref("blockURL" + set);

		// Set component values
		document.getElementById("lb-set-name" + set).value = setName;
		document.getElementById("lb-sites" + set).value = sites;
		document.getElementById("lb-sites-URL" + set).value = sitesURL;
		document.getElementById("lb-active-block" + set).checked = activeBlock;
		document.getElementById("lb-prev-opts" + set).checked = prevOpts;
		document.getElementById("lb-prev-addons" + set).checked = prevAddons;
		document.getElementById("lb-prev-config" + set).checked = prevConfig;
		document.getElementById("lb-count-focus" + set).checked = countFocus;
		document.getElementById("lb-delay-secs" + set).value = delaySecs;
		document.getElementById("lb-times" + set).value = times;
		document.getElementById("lb-limit-mins" + set).value = limitMins;
		document.getElementById("lb-limit-period" + set).value = limitPeriod;
		document.getElementById("lb-mode" + set).selectedIndex = conjMode ? 1 : 0;
		for (var i = 0; i < 7; i++) {
			document.getElementById("lb-day" + i + set).checked = daySel[i];
		}
		document.getElementById("lb-block-page" + set).value = blockURL;

		if (setName != "") {
			// Set custom label
			document.getElementById("lb-tab-set" + set).label = setName;
		}
	}

	// Get other preferences
	var ham = LeechBlock_getBoolPref("ham");
	var hsm = LeechBlock_getBoolPref("hsm");
	var warnSecs = LeechBlock_getCharPref("warnSecs");
	var bep = LeechBlock_getBoolPref("bep");
	var kpb = LeechBlock_getBoolPref("kpb");
	var hcm = LeechBlock_getBoolPref("hcm");
	var htl = LeechBlock_getBoolPref("htl");
	document.getElementById("lb-options-ham").checked = ham;
	document.getElementById("lb-options-hsm").checked = hsm;
	document.getElementById("lb-options-warn-secs").value = warnSecs;
	document.getElementById("lb-options-bep").checked = bep;
	document.getElementById("lb-options-kpb").checked = kpb;
	document.getElementById("lb-options-hcm").checked = hcm;
	document.getElementById("lb-options-htl").checked = htl;
}

// Handles options dialog OK button
//
function LeechBlock_optionsOK() {
	// Check format for time periods and time limits
	for (var set = 1; set <= 6; set++) {
		// Get component values
		var times = document.getElementById("lb-times" + set).value;
		var limitMins = document.getElementById("lb-limit-mins" + set).value;
		var delaySecs = document.getElementById("lb-delay-secs" + set).value;

		// Check values
		if (!LeechBlock_checkTimesFormat(times)) {
			LeechBlock_setOuterTab(set - 1);
			LeechBlock_setInnerTab(set, 1);
			LeechBlock_alertBadTimes();
			document.getElementById("lb-times" + set).focus();
			return false;
		}
		if (!LeechBlock_checkPosIntFormat(limitMins)) {
			LeechBlock_setOuterTab(set - 1);
			LeechBlock_setInnerTab(set, 1);
			LeechBlock_alertBadTimeLimit();
			document.getElementById("lb-limit-mins" + set).focus();
			return false;
		}
		if (!LeechBlock_checkPosIntFormat(delaySecs) || delaySecs == "") {
			LeechBlock_setOuterTab(set - 1);
			LeechBlock_setInnerTab(set, 2);
			LeechBlock_alertBadSeconds();
			document.getElementById("lb-delay-secs" + set).focus();
			return false;
		}
	}

	// Check format for seconds before warning message
	var warnSecs = document.getElementById("lb-options-warn-secs").value;
	if (!LeechBlock_checkPosIntFormat(warnSecs)) {
		LeechBlock_setOuterTab(7);
		LeechBlock_alertBadSeconds();
		document.getElementById("lb-options-warn-secs").focus();
		return false;
	}

	// Confirm settings where access to options is prevented all day
	for (var set = 1; set <= 6; set++) {
		// Get component values
		var prevOpts = document.getElementById("lb-prev-opts" + set).checked;
		var times = document.getElementById("lb-times" + set).value;

		if (!document.getElementById("lb-prev-opts" + set).disabled
				&& prevOpts && times == LeechBlock_ALL_DAY_TIMES) {
			LeechBlock_setOuterTab(set - 1);
			LeechBlock_setInnerTab(set, 1);
			if (!LeechBlock_confirmPrevOptsAllDay()) {
				document.getElementById("lb-times" + set).focus();
				return false;
			}
		}
	}

	for (var set = 1; set <= 6; set++) {
		// Get component values
		var setName = document.getElementById("lb-set-name" + set).value;
		var sites = document.getElementById("lb-sites" + set).value;
		sites = sites.replace(/\s+/g, " ").replace(/(^ +)|( +$)|(\w+:\/+)/g, "");
		sites = sites.split(" ").sort().join(" "); // sort alphabetically
		var sitesURL = document.getElementById("lb-sites-URL" + set).value;
		var activeBlock = document.getElementById("lb-active-block" + set).checked;
		var prevOpts = document.getElementById("lb-prev-opts" + set).checked;
		var prevAddons = document.getElementById("lb-prev-addons" + set).checked;
		var prevConfig = document.getElementById("lb-prev-config" + set).checked;
		var countFocus = document.getElementById("lb-count-focus" + set).checked;
		var delaySecs = document.getElementById("lb-delay-secs" + set).value;
		var times = document.getElementById("lb-times" + set).value;
		var limitMins = document.getElementById("lb-limit-mins" + set).value;
		var limitPeriod = document.getElementById("lb-limit-period" + set).value;
		var conjMode = document.getElementById("lb-mode" + set).selectedIndex == 1;
		var daySel = new Array(7);
		for (var i = 0; i < 7; i++) {
			daySel[i] = document.getElementById("lb-day" + i + set).checked;
		}
		var blockURL = document.getElementById("lb-block-page" + set).value;

		// Get regular expressions to match sites
		var regexps = LeechBlock_getRegExpSites(sites);

		// Reset time data if time limit period has been changed
		if (limitPeriod != LeechBlock_getCharPref("limitPeriod" + set)) {
			var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
			if (timedata.length == 5) {
				timedata[2] = 0;
				timedata[3] = 0;
				LeechBlock_setCharPref("timedata" + set, timedata.join(","));
			}
		}

		// Set preferences
		LeechBlock_setUniCharPref("setName" + set, setName);
		LeechBlock_setUniCharPref("sites" + set, sites);
		LeechBlock_setUniCharPref("sitesURL" + set, sitesURL);
		LeechBlock_setBitPref("activeBlock", set, activeBlock);
		LeechBlock_setBitPref("prevOpts", set, prevOpts);
		LeechBlock_setBitPref("prevAddons", set, prevAddons);
		LeechBlock_setBitPref("prevConfig", set, prevConfig);
		LeechBlock_setBitPref("countFocus", set, countFocus);
		LeechBlock_setCharPref("delaySecs" + set, delaySecs);
		LeechBlock_setUniCharPref("blockRE" + set, regexps.block);
		LeechBlock_setUniCharPref("allowRE" + set, regexps.allow);
		LeechBlock_setCharPref("times" + set, times);
		LeechBlock_setCharPref("limitMins" + set, limitMins);
		LeechBlock_setCharPref("limitPeriod" + set, limitPeriod);
		LeechBlock_setBitPref("conjMode", set, conjMode);
		LeechBlock_setIntPref("days" + set, LeechBlock_encodeDays(daySel));
		LeechBlock_setUniCharPref("blockURL" + set, blockURL);
	}

	// Set other preferences
	var oa = document.getElementById("lb-options-access").value;
	var hpp = document.getElementById("lb-options-hpp").checked;
	var ham = document.getElementById("lb-options-ham").checked;
	var hsm = document.getElementById("lb-options-hsm").checked;
	var bep = document.getElementById("lb-options-bep").checked;
	var kpb = document.getElementById("lb-options-kpb").checked;
	var hcm = document.getElementById("lb-options-hcm").checked;
	var htl = document.getElementById("lb-options-htl").checked;
	LeechBlock_setIntPref("oa", oa);
	LeechBlock_setBoolPref("hpp", hpp);
	LeechBlock_setBoolPref("ham", ham);
	LeechBlock_setBoolPref("hsm", hsm);
	LeechBlock_setCharPref("warnSecs", warnSecs);
	LeechBlock_setBoolPref("bep", bep);
	LeechBlock_setBoolPref("kpb", kpb);
	LeechBlock_setBoolPref("hcm", hcm);
	LeechBlock_setBoolPref("htl", htl);

	// Set password
	var password = document.getElementById("lb-options-password").value;
	LeechBlock_storePassword(password);

	// Save all preferences to file (in case browser not properly closed later on)
	LeechBlock_savePreferences();

	return true;
}

// Handles options dialog Cancel button
//
function LeechBlock_optionsCancel() {
	return true;
}

// Disables options for block set
//
function LeechBlock_disableSetOptions(set) {
	var items = [
		"sites", "sites-URL",
		"active-block", "count-focus", "delay-secs",
		"times", "all-day",
		"limit-mins", "limit-period", "mode",
		"day0", "day1", "day2", "day3", "day4", "day5", "day6", "every-day",
		"block-page", "default-page", "delaying-page", "blank-page", "home-page",
		"set-name", "clear-set-name",
		"prev-opts", "prev-addons", "prev-config", "cancel-lockdown",
	];
	for each (var item in items) {
		document.getElementById("lb-" + item + set).disabled = true;
	}
}

// Updates options for password
//
function LeechBlock_updatePasswordOptions() {
	var disabled = document.getElementById("lb-options-access").value != 1;
	document.getElementById("lb-options-password").disabled = disabled;
	document.getElementById("lb-clear-password").disabled = disabled;
	document.getElementById("lb-options-hpp").disabled = disabled;
}

// Sets outer tab for options
//
function LeechBlock_setOuterTab(index) {
	document.getElementById("lb-options-tabbox").selectedIndex = index;
}

// Sets inner tab for block set
//
function LeechBlock_setInnerTab(set, index) {
	document.getElementById("lb-tabbox-set" + set).selectedIndex = index;
}

// Sets time periods to all day
//
function LeechBlock_setAllDay(set) {
	document.getElementById("lb-times" + set).value = LeechBlock_ALL_DAY_TIMES;
}

// Sets days to every day
//
function LeechBlock_setEveryDay(set) {
	for (var i = 0; i < 7; i++) {
		document.getElementById(("lb-day" + i) + set).checked = true;
	}
}

// Sets URL to default page
//
function LeechBlock_setDefaultPage(set) {
	document.getElementById("lb-block-page" + set).value = LeechBlock_DEFAULT_BLOCK_URL;
}

// Sets URL to delaying page
//
function LeechBlock_setDelayingPage(set) {
	document.getElementById("lb-block-page" + set).value = LeechBlock_DELAYED_BLOCK_URL;
}

// Sets URL to blank page
//
function LeechBlock_setBlankPage(set) {
	document.getElementById("lb-block-page" + set).value = "about:blank";
}

// Sets URL to home page
//
function LeechBlock_setHomePage(set) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("browser.startup.");
	// Get all home pages but use only the first
	var homepages = prefs.getCharPref("homepage").split("|");
	document.getElementById("lb-block-page" + set).value = homepages[0];
}

// Clears custom set name
//
function LeechBlock_clearSetName(set) {
	document.getElementById("lb-set-name" + set).value = "";
}

// Clears password for access to options
//
function LeechBlock_clearPassword() {
	document.getElementById("lb-options-password").value = "";
}

// Cancels the currently active lockdown
//
function LeechBlock_cancelLockdown(set) {
	// Get confirmation from user
	if (!LeechBlock_confirmCancelLockdown()) {
		return;
	}

	// Reset lockdown component of time data
	var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
	if (timedata.length == 5) {
		timedata[4] = 0;
	}
	LeechBlock_setCharPref("timedata" + set, timedata.join(","));

	// Disable 'Cancel Lockdown' button
	document.getElementById("lb-cancel-lockdown" + set).disabled = true;
}

// Exports options to a text file
//
function LeechBlock_exportOptions() {
	const nsIFilePicker = Components.interfaces.nsIFilePicker;

	// Get user to choose file
	var filePicker = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(nsIFilePicker);
	filePicker.init(window, "Export LeechBlock Options", nsIFilePicker.modeSave);
	filePicker.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
	filePicker.filterIndex = 1;
	var ret = filePicker.show();
	if (ret != nsIFilePicker.returnOK && ret != nsIFilePicker.returnReplace) {
		return;
	}

	var text = "";

	// Add option values for each set
	for (var set = 1; set <= 6; set++) {
		// Get component values
		var setName = document.getElementById("lb-set-name" + set).value;
		var sites = document.getElementById("lb-sites" + set).value;
		sites = sites.replace(/\s+/g, " ").replace(/(^ +)|( +$)|(\w+:\/+)/g, "");
		var sitesURL = document.getElementById("lb-sites-URL" + set).value;
		var activeBlock = document.getElementById("lb-active-block" + set).checked;
		var prevOpts = document.getElementById("lb-prev-opts" + set).checked;
		var prevAddons = document.getElementById("lb-prev-addons" + set).checked;
		var prevConfig = document.getElementById("lb-prev-config" + set).checked;
		var countFocus = document.getElementById("lb-count-focus" + set).checked;
		var delaySecs = document.getElementById("lb-delay-secs" + set).value;
		var times = document.getElementById("lb-times" + set).value;
		var limitMins = document.getElementById("lb-limit-mins" + set).value;
		var limitPeriod = document.getElementById("lb-limit-period" + set).value;
		var conjMode = document.getElementById("lb-mode" + set).selectedIndex == 1;
		var daySel = new Array(7);
		for (var i = 0; i < 7; i++) {
			daySel[i] = document.getElementById("lb-day" + i + set).checked;
		}
		var blockURL = document.getElementById("lb-block-page" + set).value;

		// Add values to text
		text += "setName" + set + "=" + setName + "\n";
		text += "sites" + set + "=" + sites + "\n";
		text += "sitesURL" + set + "=" + sitesURL + "\n";
		text += "activeBlock" + set + "=" + activeBlock + "\n";
		text += "prevOpts" + set + "=" + prevOpts + "\n";
		text += "prevAddons" + set + "=" + prevAddons+ "\n";
		text += "prevConfig" + set + "=" + prevConfig + "\n";
		text += "countFocus" + set + "=" + countFocus + "\n";
		text += "delaySecs" + set + "=" + delaySecs + "\n";
		text += "times" + set + "=" + times + "\n";
		text += "limitMins" + set + "=" + limitMins + "\n";
		text += "limitPeriod" + set + "=" + limitPeriod + "\n";
		text += "conjMode" + set + "=" + conjMode + "\n";
		text += "days" + set + "=" + LeechBlock_encodeDays(daySel) + "\n";
		text += "blockURL" + set + "=" + blockURL + "\n";
	}

	// Add other option values
	var oa = document.getElementById("lb-options-access").value;
	var password = document.getElementById("lb-options-password").value;
	var hpp = document.getElementById("lb-options-hpp").checked;
	var ham = document.getElementById("lb-options-ham").checked;
	var hsm = document.getElementById("lb-options-hsm").checked;
	var warnSecs = document.getElementById("lb-options-warn-secs").value;
	var bep = document.getElementById("lb-options-bep").checked;
	var kpb = document.getElementById("lb-options-kpb").checked;
	var hcm = document.getElementById("lb-options-hcm").checked;
	var htl = document.getElementById("lb-options-htl").checked;
	text += "oa=" + oa + "\n";
	text += "password=" + password + "\n";
	text += "hpp=" + hpp + "\n";
	text += "ham=" + ham + "\n";
	text += "hsm=" + hsm + "\n";
	text += "warnSecs=" + warnSecs + "\n";
	text += "bep=" + bep + "\n";
	text += "kpb=" + kpb + "\n";
	text += "hcm=" + hcm + "\n";
	text += "htl=" + htl + "\n";

	// Write text to file
	try {
		LeechBlock_writeTextFile(filePicker.file, text);
	} catch (e) {
		LeechBlock_printConsole("Cannot export options to file."
				+ " [" + filePicker.file.path + "]");
		return;
	}
}

// Imports options from a text file
//
function LeechBlock_importOptions() {
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	const replaceChar = Components.interfaces.nsIConverterInputStream
			.DEFAULT_REPLACEMENT_CHARACTER;

	function isTrue(str) { return /^true$/i.test(str); }

	// Get user to choose file
	var filePicker = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(nsIFilePicker);
	filePicker.init(window, "Import LeechBlock Options", nsIFilePicker.modeOpen);
	filePicker.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
	filePicker.filterIndex = 1;
	var ret = filePicker.show();
	if (ret != nsIFilePicker.returnOK) {
		return;
	}

	var text = "";

	// Read text from file
	try {
		text = LeechBlock_readTextFile(filePicker.file);
	} catch (e) {
		LeechBlock_printConsole("Cannot import options from file."
				+ " [" + filePicker.file.path + "]");
	}

	// Get options from text
	var regexp = /^(\w+)=(.*)$/;
	var lines = text.split(/\n/);
	var opts = {};
	for (var i in lines) {
		var results = regexp.exec(lines[i]);
		if (results != null) {
			opts[results[1]] = results[2];
		}
	}

	// Process option values for each set
	for (var set = 1; set <= 6; set++) {
		// Get values from options
		var setName = opts["setName" + set];
		var sites = opts["sites" + set];
		var sitesURL = opts["sitesURL" + set];
		var activeBlock = opts["activeBlock" + set];
		var prevOpts = opts["prevOpts" + set];
		var prevAddons = opts["prevAddons" + set];
		var prevConfig = opts["prevConfig" + set];
		var countFocus = opts["countFocus" + set];
		var delaySecs = opts["delaySecs" + set];
		var times = opts["times" + set];
		var limitMins = opts["limitMins" + set]
		var limitPeriod = opts["limitPeriod" + set]
		var conjMode = opts["conjMode" + set];
		var days = opts["days" + set];
		var blockURL = opts["blockURL" + set];

		// Set component values
		if (setName != undefined) {
			var element = document.getElementById("lb-set-name" + set);
			if (!element.disabled) {
				element.value = setName;
			}
		}
		if (sites != undefined) {
			sites = sites.replace(/\s+/g, "\n");
			var element = document.getElementById("lb-sites" + set);
			if (!element.disabled) {
				element.value = sites;
			}
		}
		if (sitesURL != undefined) {
			var element = document.getElementById("lb-sites-URL" + set);
			if (!element.disabled) {
				element.value = sitesURL;
			}
		}
		if (activeBlock != undefined) {
			var element = document.getElementById("lb-active-block" + set);
			if (!element.disabled) {
				element.checked = isTrue(activeBlock);
			}
		}
		if (prevOpts != undefined) {
			var element = document.getElementById("lb-prev-opts" + set);
			if (!element.disabled) {
				element.checked = isTrue(prevOpts);
			}
		}
		if (prevAddons != undefined) {
			var element = document.getElementById("lb-prev-addons" + set);
			if (!element.disabled) {
				element.checked = isTrue(prevAddons);
			}
		}
		if (prevConfig != undefined) {
			var element = document.getElementById("lb-prev-config" + set);
			if (!element.disabled) {
				element.checked = isTrue(prevConfig);
			}
		}
		if (countFocus != undefined) {
			var element = document.getElementById("lb-count-focus" + set);
			if (!element.disabled) {
				element.checked = isTrue(countFocus);
			}
		}
		if (delaySecs != undefined) {
			var element = document.getElementById("lb-delay-secs" + set);
			if (!element.disabled) {
				element.value = delaySecs;
			}
		}
		if (times != undefined) {
			var element = document.getElementById("lb-times" + set);
			if (!element.disabled) {
				element.value = times;
			}
		}
		if (limitMins != undefined) {
			var element = document.getElementById("lb-limit-mins" + set);
			if (!element.disabled) {
				element.value = limitMins;
			}
		}
		if (limitPeriod != undefined) {
			var element = document.getElementById("lb-limit-period" + set);
			if (!element.disabled) {
				element.value = limitPeriod;
			}
		}
		if (conjMode != undefined) {
			var element = document.getElementById("lb-mode" + set);
			if (!element.disabled) {
				element.selectedIndex = isTrue(conjMode) ? 1 : 0;
			}
		}
		if (days != undefined) {
			var daySel = LeechBlock_decodeDays(days);
			for (var i = 0; i < 7; i++) {
				var element = document.getElementById("lb-day" + i + set);
				if (!element.disabled) {
					element.checked = daySel[i];
				}
			}
		}
		if (blockURL != undefined) {
			var element = document.getElementById("lb-block-page" + set);
			if (!element.disabled) {
				element.value = blockURL;
			}
		}
	}

	// Process other option values
	var oa = opts["oa"];
	var password = opts["password"];
	var hpp = opts["hpp"];
	var ham = opts["ham"];
	var hsm = opts["hsm"];
	var warnSecs = opts["warnSecs"];
	var bep = opts["bep"];
	var kpb = opts["kpb"];
	var hcm = opts["hcm"];
	var htl = opts["htl"];
	if (oa != undefined) {
		document.getElementById("lb-options-access").value = oa;
	}
	if (password != undefined) {
		document.getElementById("lb-options-password").value = password;
	}
	if (hpp != undefined) {
		document.getElementById("lb-options-hpp").checked = isTrue(hpp);
	}
	if (ham != undefined) {
		document.getElementById("lb-options-ham").checked = isTrue(ham);
	}
	if (hsm != undefined) {
		document.getElementById("lb-options-hsm").checked = isTrue(hsm);
	}
	if (warnSecs != undefined) {
		document.getElementById("lb-options-warn-secs").value = warnSecs;
	}
	if (bep != undefined) {
		document.getElementById("lb-options-bep").checked = isTrue(bep);
	}
	if (kpb != undefined) {
		document.getElementById("lb-options-kpb").checked = isTrue(kpb);
	}
	if (hcm != undefined) {
		document.getElementById("lb-options-hcm").checked = isTrue(hcm);
	}
	if (htl != undefined) {
		document.getElementById("lb-options-htl").checked = isTrue(htl);
	}
	LeechBlock_updatePasswordOptions();
}
