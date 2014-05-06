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
 * This file contains the code for the access code dialog.  It was necessary
 * to create this dialog (rather than use nsIPromptService.confirmEx) because
 * since Firefox 3 the text in the common dialog can be copied and pasted!
 */

// Handles access code dialog initialization
//
function LeechBlock_accesscodeInit() {
	var code = window.arguments[0]; // input argument (pass by value)
	document.getElementById("lb-accesscode-code").value = code;
}

// Handles access code dialog OK button
//
function LeechBlock_accesscodeOK() {
	var usercode = window.arguments[1]; // output argument (pass by object)
	usercode.value = document.getElementById("lb-accesscode-text").value;
	return true;
}

// Handles access code dialog Cancel button
//
function LeechBlock_accesscodeCancel() {
	return true;
}
