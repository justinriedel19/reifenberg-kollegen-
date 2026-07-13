Tobias Reifenberg & Kollegen - ABC Analyse & Vertriebs-Dashboard
================================================================

Dieses Projekt ist eine fertige Firebase-Web-App fuer die interne Nutzung.
Sie nutzt Firebase Authentication, Firebase Realtime Database und Firebase Hosting.


1. Firebase-Projekt anlegen
---------------------------
1. Firebase Console oeffnen: https://console.firebase.google.com/
2. Neues Projekt erstellen oder ein bestehendes Projekt auswaehlen.
3. Eine Web-App im Projekt registrieren.
4. Die Firebase-Konfigurationswerte kopieren.


2. Firebase-Konfiguration eintragen
-----------------------------------
Oeffne die Datei:

firebase-config.js

Ersetze dort alle Platzhalter durch die Werte aus deiner Firebase-Web-App.
Wichtig: Es werden keine Passwoerter im Code gespeichert.


3. Authentication aktivieren
----------------------------
1. In Firebase "Authentication" oeffnen.
2. "Sign-in method" oeffnen.
3. Anbieter "E-Mail/Passwort" aktivieren.
4. Keine oeffentliche Registrierung in der App einbauen oder aktivieren.

Lege diese Benutzer manuell in Firebase Authentication an:

- Tobias Reifenberg, tobias@reifenberg.de, Rolle in der App: Admin
- Justin Riedel, justin@riedel.de, Rolle in der App: Mitarbeiter
- Elias Diel, elias@diel.de, Rolle in der App: Mitarbeiter
- Dominik Gronewaldt, dominik@gronewaldt.de, Rolle in der App: Mitarbeiter
- Katrin vom Bruch, katrin@vombruch.de, Rolle in der App: Mitarbeiter

Die Passwoerter legst du direkt in Firebase Authentication fest.
Die App erkennt die Rolle anhand der E-Mail-Adresse.


4. Realtime Database einrichten
-------------------------------
1. In Firebase "Realtime Database" oeffnen.
2. Datenbank erstellen.
3. Region auswaehlen.
4. Falls deine Database-URL anders ist als im Platzhalter, trage sie in firebase-config.js bei databaseURL ein.

Die App verwendet diese Hauptpfade:

users/{uid}
tasks/{uid}/{taskId}
salesEntries/{uid}/{entryId}

Die Daten sind nach Benutzer-UID gruppiert. Dadurch koennen Mitarbeiter technisch nur eigene Aufgaben, Termine und Antraege lesen oder bearbeiten. Tobias Reifenberg darf als Admin alle Daten lesen und bearbeiten.


5. Datenbankregeln uebernehmen
------------------------------
Die Regeln stehen in:

database.rules.json

Du kannst sie entweder in der Firebase Console unter Realtime Database > Rules einfuegen oder per Firebase CLI deployen.

Per Firebase CLI:

firebase deploy --only database

Wichtig:
- Nur eingeloggte Benutzer duerfen lesen und schreiben.
- Tobias Reifenberg wird per E-Mail als Admin erkannt.
- Mitarbeiter duerfen nur eigene Daten lesen und schreiben.
- Mitarbeiter duerfen Bonuszahlungen nicht anlegen oder veraendern.
- Bonuszahlungen duerfen nur durch Tobias Reifenberg eingetragen oder geaendert werden.


6. Lokal testen
---------------
Starte im Projektordner einen lokalen Webserver, zum Beispiel:

python3 -m http.server 5173

Oeffne danach:

http://localhost:5173

Hinweis: Wegen JavaScript-Modulen und Service Worker sollte die App ueber einen lokalen Server und nicht direkt per Datei-Doppelklick geoeffnet werden.


7. GitHub Upload
----------------
1. Neues GitHub Repository erstellen.
2. Alle Projektdateien hochladen.
3. Keine Firebase-Passwoerter oder privaten Zugangsdaten in das Repository schreiben.
4. firebase-config.js enthaelt nur die oeffentliche Web-App-Konfiguration von Firebase.


8. Firebase Hosting veroeffentlichen
------------------------------------
Variante A: Firebase CLI

1. Firebase CLI installieren, falls noch nicht vorhanden:
   npm install -g firebase-tools

2. Anmelden:
   firebase login

3. Projekt verbinden:
   firebase use --add

4. Hosting und Regeln deployen:
   firebase deploy


Variante B: GitHub mit Firebase Hosting verbinden

1. In Firebase Hosting "GitHub verbinden" auswaehlen.
2. Repository auswaehlen.
3. Build-Schritt leer lassen, weil diese App keinen Build-Prozess braucht.
4. Als Public Directory "." verwenden.
5. Deployment starten.


9. Datenschutz-Hinweise
-----------------------
- Keine oeffentliche Registrierung verwenden.
- Keine Passwoerter im Code speichern.
- Keine sensiblen Gesundheitsdaten im Freitext speichern.
- Kundennamen, Beitraege, Provisionen und Boni nur fuer berechtigte Benutzer sichtbar machen.
- Mitarbeiter sehen nur eigene Daten.
- Tobias Reifenberg sieht als Admin die Gesamtuebersicht.


Startdatei
----------
index.html

Sobald firebase-config.js ausgefuellt ist und die Benutzer in Firebase Authentication angelegt sind, ist die App startklar.
