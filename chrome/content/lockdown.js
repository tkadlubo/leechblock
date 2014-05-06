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
 * This file contains the code for the Lockdown dialog.
 */

// Handles lockdown dialog initialization
//
function LeechBlock_lockdownInit() {
	// Get current time in seconds
	var now = Math.floor(Date.now() / 1000);

	// Check whether a lockdown is currently active
	var endTime = 0;
	for (var set = 1; set <= 6; set++) {
		var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
		if (timedata.length == 5) {
			endTime = Math.max(endTime, timedata[4]);
		}
	}
	if (endTime > now) {
		// Show alert dialog with end time
		LeechBlock_alertLockdown(new Date(endTime * 1000).toLocaleString());
		// Close lockdown dialog
		window.close();
	}

	// Get preferences
	var duration = LeechBlock_getIntPref("lockdownDuration");
	var sets = LeechBlock_getIntPref("lockdownSets");

	// Set component values
	var hours = Math.floor(duration / 3600);
	var mins = Math.floor(duration / 60) % 60;
	document.getElementById("lb-lockdown-hours").value = hours;
	document.getElementById("lb-lockdown-mins").value = mins;
	for (var set = 1; set <= 6; set++) {
		var lockdown = (sets & (1 << (set - 1))) != 0;
		document.getElementById("lb-lockdown-set" + set).checked = lockdown;
		document.getElementById("lb-lockdown-set" + set).label += " "
				+ LeechBlock_getLockdownBlockSetLabel(set);
	}
}

// Handles lockdown dialog OK button
//
function LeechBlock_lockdownOK() {
	// Get component values
	var hours = document.getElementById("lb-lockdown-hours").value;
	var mins = document.getElementById("lb-lockdown-mins").value;
	var duration = hours * 3600 + mins * 60;
	var sets = 0;
	for (var set = 1; set <= 6; set++) {
		var lockdown = document.getElementById("lb-lockdown-set" + set).checked;
		if (lockdown) sets |= (1 << (set - 1));
	}

	// Set preferences
	LeechBlock_setIntPref("lockdownDuration", duration);
	LeechBlock_setIntPref("lockdownSets", sets);

	// Get current time in seconds
	var now = Math.floor(Date.now() / 1000);

	// Update time data for selected block sets
	for (var set = 1; set <= 6; set++) {
		var lockdown = document.getElementById("lb-lockdown-set" + set).checked;

		if (lockdown) {
			// Update time data for this set
			var timedata = LeechBlock_getCharPref("timedata" + set).split(",");
			if (timedata.length == 5) {
				timedata[4] = now + duration;
			} else {
				timedata = [now, 0, 0, 0, now + duration];
			}
			LeechBlock_setCharPref("timedata" + set, timedata.join(","));
		}
	}

	return true;
}

// Handles lockdown dialog Cancel button
//
function LeechBlock_lockdownCancel() {
	return true;
}
