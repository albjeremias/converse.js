/*jshint sub:true*/
/*eslint dot-notation: "off"*/
(function (root, factory) {
    define([
        "jasmine",
        "jquery",
        "mock",
        "test-utils",
    ], factory);
} (this, function (jasmine, $, mock, test_utils) {
    "use strict";
    var Strophe = converse.env.Strophe;
    var $iq = converse.env.$iq;
    var $pres = converse.env.$pres;
    var _ = converse.env._;
    var u = converse.env.utils;
    // See: https://xmpp.org/rfcs/rfc3921.html

    describe("A sent presence stanza", function () {

        it("includes a entity capabilities node",
            mock.initConverseWithPromises(
                null, ['rosterGroupsFetched'], {},
                function (done, _converse) {

                _converse.api.disco.own.identities.clear();
                _converse.api.disco.own.features.clear();

                _converse.api.disco.own.identities.add("client", "pc", "Exodus 0.9.1");
                _converse.api.disco.own.features.add("http://jabber.org/protocol/caps");
                _converse.api.disco.own.features.add("http://jabber.org/protocol/disco#info");
                _converse.api.disco.own.features.add("http://jabber.org/protocol/disco#items");
                _converse.api.disco.own.features.add("http://jabber.org/protocol/muc");

                const presence = _converse.xmppstatus.constructPresence();
                expect(presence.toLocaleString()).toBe(
                    "<presence xmlns='jabber:client'>"+
                        "<priority>0</priority>"+
                        "<c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='https://conversejs.org' ver='QgayPKawpkPSDYmwT/WM94uAlu0='/>"+
                    "</presence>")
                done();
        }));

        it("has a given priority", mock.initConverse(function (_converse) {
            var pres = _converse.xmppstatus.constructPresence('online', 'Hello world');
            expect(pres.toLocaleString()).toBe(
                "<presence xmlns='jabber:client'>"+
                    "<status>Hello world</status>"+
                    "<priority>0</priority>"+
                    "<c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='https://conversejs.org' ver='wmJWAEmiBuDhg0VUoDmqHp3qXJ0='/>"+
                "</presence>"
            );
            _converse.priority = 2;
            pres = _converse.xmppstatus.constructPresence('away', 'Going jogging');
            expect(pres.toLocaleString()).toBe(
                "<presence xmlns='jabber:client'>"+
                    "<show>away</show>"+
                    "<status>Going jogging</status>"+
                    "<priority>2</priority>"+
                    "<c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='https://conversejs.org' ver='wmJWAEmiBuDhg0VUoDmqHp3qXJ0='/>"+
                "</presence>"
            );

            delete _converse.priority;
            pres = _converse.xmppstatus.constructPresence('dnd', 'Doing taxes');
            expect(pres.toLocaleString()).toBe(
                "<presence xmlns='jabber:client'>"+
                    "<show>dnd</show>"+
                    "<status>Doing taxes</status>"+
                    "<priority>0</priority>"+
                    "<c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='https://conversejs.org' ver='wmJWAEmiBuDhg0VUoDmqHp3qXJ0='/>"+
                "</presence>"
            );
        }));

        it("includes the saved status message",
            mock.initConverseWithPromises(
                null, ['rosterGroupsFetched'], {},
                function (done, _converse) {

            test_utils.openControlBox();
            var view = _converse.xmppstatusview;
            spyOn(view.model, 'sendPresence').and.callThrough();
            spyOn(_converse.connection, 'send').and.callThrough();

            var cbview = _converse.chatboxviews.get('controlbox');
            cbview.el.querySelector('.change-status').click()
            var modal = _converse.xmppstatusview.status_modal;
            test_utils.waitUntil(function () {
                return u.isVisible(modal.el);
            }, 1000).then(function () {
                var msg = 'My custom status';
                modal.el.querySelector('input[name="status_message"]').value = msg;
                modal.el.querySelector('[type="submit"]').click();
                expect(view.model.sendPresence).toHaveBeenCalled();
                expect(_converse.connection.send.calls.mostRecent().args[0].toLocaleString())
                    .toBe("<presence xmlns='jabber:client'>"+
                          "<status>My custom status</status>"+
                          "<priority>0</priority>"+
                          "<c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='https://conversejs.org' ver='wmJWAEmiBuDhg0VUoDmqHp3qXJ0='/>"+
                          "</presence>")

                return test_utils.waitUntil(function () {
                    return modal.el.getAttribute('aria-hidden') === "true";
                });
            }).then(function () {
                cbview.el.querySelector('.change-status').click()
                return test_utils.waitUntil(function () {
                    return modal.el.getAttribute('aria-hidden') === "false";
                }, 1000);
            }).then(function () {
                modal.el.querySelector('label[for="radio-busy"]').click(); // Change status to "dnd"
                modal.el.querySelector('[type="submit"]').click();
                expect(_converse.connection.send.calls.mostRecent().args[0].toLocaleString())
                    .toBe("<presence xmlns='jabber:client'><show>dnd</show><status>My custom status</status><priority>0</priority>"+
                          "<c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='https://conversejs.org' ver='wmJWAEmiBuDhg0VUoDmqHp3qXJ0='/>"+
                          "</presence>")
                done();
            });
        }));
    });

    describe("A received presence stanza", function () {

        it("has its priority taken into account",
            mock.initConverseWithPromises(
                null, ['rosterGroupsFetched'], {},
                function (done, _converse) {

            test_utils.openControlBox();
            test_utils.createContacts(_converse, 'current'); // Create some contacts so that we can test positioning
            var contact_jid = mock.cur_names[8].replace(/ /g,'.').toLowerCase() + '@localhost';
            var contact = _converse.roster.get(contact_jid);
            var stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          from="'+contact_jid+'/priority-1-resource">'+
            '    <priority>1</priority>'+
            '    <c xmlns="http://jabber.org/protocol/caps" hash="sha-1" ext="voice-v1 camera-v1 video-v1"'+
            '       ver="AcN1/PEN8nq7AHD+9jpxMV4U6YM=" node="http://pidgin.im/"/>'+
            '    <x xmlns="vcard-temp:x:update">'+
            '        <photo>ce51d94f7f22b87a21274abb93710b9eb7cc1c65</photo>'+
            '    </x>'+
            '    <delay xmlns="urn:xmpp:delay" stamp="2017-02-15T20:26:05Z" from="'+contact_jid+'/priority-1-resource"/>'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(contact.presence.get('show')).toBe('online');
            expect(_.keys(contact.presence.get('resources')).length).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          from="'+contact_jid+'/priority-0-resource">'+
            '    <status/>'+
            '    <priority>0</priority>'+
            '    <show>xa</show>'+
            '    <c xmlns="http://jabber.org/protocol/caps" ver="GyIX/Kpa4ScVmsZCxRBboJlLAYU=" hash="sha-1"'+
            '       node="http://www.igniterealtime.org/projects/smack/"/>'+
            '    <delay xmlns="urn:xmpp:delay" stamp="2017-02-15T17:02:24Z" from="'+contact_jid+'/priority-0-resource"/>'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('online');
            expect(_.keys(contact.presence.get('resources')).length).toBe(2);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          from="'+contact_jid+'/priority-2-resource">'+
            '    <priority>2</priority>'+
            '    <show>dnd</show>'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('dnd');
            expect(_.keys(contact.presence.get('resources')).length).toBe(3);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');
            expect(contact.presence.get('resources')['priority-2-resource']['priority']).toBe(2);
            expect(contact.presence.get('resources')['priority-2-resource']['show']).toBe('dnd');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          from="'+contact_jid+'/priority-3-resource">'+
            '    <priority>3</priority>'+
            '    <show>away</show>'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('away');
            expect(_.keys(contact.presence.get('resources')).length).toBe(4);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');
            expect(contact.presence.get('resources')['priority-2-resource']['priority']).toBe(2);
            expect(contact.presence.get('resources')['priority-2-resource']['show']).toBe('dnd');
            expect(contact.presence.get('resources')['priority-3-resource']['priority']).toBe(3);
            expect(contact.presence.get('resources')['priority-3-resource']['show']).toBe('away');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          from="'+contact_jid+'/older-priority-1-resource">'+
            '    <priority>1</priority>'+
            '    <show>dnd</show>'+
            '    <delay xmlns="urn:xmpp:delay" stamp="2017-02-15T15:02:24Z" from="'+contact_jid+'/older-priority-1-resource"/>'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('away');
            expect(_.keys(contact.presence.get('resources')).length).toBe(5);
            expect(contact.presence.get('resources')['older-priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['older-priority-1-resource']['show']).toBe('dnd');
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');
            expect(contact.presence.get('resources')['priority-2-resource']['priority']).toBe(2);
            expect(contact.presence.get('resources')['priority-2-resource']['show']).toBe('dnd');
            expect(contact.presence.get('resources')['priority-3-resource']['priority']).toBe(3);
            expect(contact.presence.get('resources')['priority-3-resource']['show']).toBe('away');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          type="unavailable"'+
            '          from="'+contact_jid+'/priority-3-resource">'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('dnd');
            expect(_.keys(contact.presence.get('resources')).length).toBe(4);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');
            expect(contact.presence.get('resources')['priority-2-resource']['priority']).toBe(2);
            expect(contact.presence.get('resources')['priority-2-resource']['show']).toBe('dnd');
            expect(contact.presence.get('resources')['older-priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['older-priority-1-resource']['show']).toBe('dnd');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          type="unavailable"'+
            '          from="'+contact_jid+'/priority-2-resource">'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('online');
            expect(_.keys(contact.presence.get('resources')).length).toBe(3);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['priority-1-resource']['show']).toBe('online');
            expect(contact.presence.get('resources')['older-priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['older-priority-1-resource']['show']).toBe('dnd');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          type="unavailable"'+
            '          from="'+contact_jid+'/priority-1-resource">'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('dnd');
            expect(_.keys(contact.presence.get('resources')).length).toBe(2);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');
            expect(contact.presence.get('resources')['older-priority-1-resource']['priority']).toBe(1);
            expect(contact.presence.get('resources')['older-priority-1-resource']['show']).toBe('dnd');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          type="unavailable"'+
            '          from="'+contact_jid+'/older-priority-1-resource">'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('xa');
            expect(_.keys(contact.presence.get('resources')).length).toBe(1);
            expect(contact.presence.get('resources')['priority-0-resource']['priority']).toBe(0);
            expect(contact.presence.get('resources')['priority-0-resource']['show']).toBe('xa');

            stanza = $(
            '<presence xmlns="jabber:client"'+
            '          to="dummy@localhost/converse.js-21770972"'+
            '          type="unavailable"'+
            '          from="'+contact_jid+'/priority-0-resource">'+
            '</presence>');
            _converse.connection._dataRecv(test_utils.createRequest(stanza[0]));
            expect(_converse.roster.get(contact_jid).presence.get('show')).toBe('offline');
            expect(_.keys(contact.presence.get('resources')).length).toBe(0);
            done();
        }));
    });
}));

