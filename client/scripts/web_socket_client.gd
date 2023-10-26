extends Node
class_name WebSocketClient

@export var handshake_headers: PackedStringArray
@export var supported_protocols: PackedStringArray
var tls_options: TLSOptions = null


var socket = WebSocketPeer.new()
var last_state = WebSocketPeer.STATE_CLOSED


signal connected_to_server()
signal connection_closed()
signal message_received(message: Variant)


func connect_to_url(url) -> int:
	socket.supported_protocols = supported_protocols
	socket.handshake_headers = handshake_headers
	var err = socket.connect_to_url(url, tls_options)
	if err != OK:
		return err
	last_state = socket.get_ready_state()
	return OK


func send(message) -> int:
	var message_to_send: String
	if typeof(message) == TYPE_STRING or typeof(message) == TYPE_DICTIONARY:
		if typeof(message) == TYPE_STRING:
			message_to_send = message
		if typeof(message) == TYPE_DICTIONARY:
			message_to_send = JSON.stringify(message)
		if Config.DEBUG:
			print("[DEBUG] Sent message: "+ message_to_send)
		return socket.send_text(message_to_send)
	return socket.send(var_to_bytes(message))


func get_message() -> Variant:
	if socket.get_available_packet_count() < 1:
		return null
	var pkt = socket.get_packet()
	if socket.was_string_packet():
		var message = pkt.get_string_from_utf8()
		if Config.DEBUG:
			print("[DEBUG] Received message: " + message)
		var json = JSON.new()
		var error = json.parse(message)
		if error == OK:
			return json.data
		return message
	return bytes_to_var(pkt)


func close(code := 1000, reason := "") -> void:
	socket.close(code, reason)
	last_state = socket.get_ready_state()


func clear() -> void:
	socket = WebSocketPeer.new()
	last_state = socket.get_ready_state()


func get_socket() -> WebSocketPeer:
	return socket


func poll() -> void:
	if socket.get_ready_state() != socket.STATE_CLOSED:
		socket.poll()
	var state = socket.get_ready_state()
	if last_state != state:
		last_state = state
		if state == socket.STATE_OPEN:
			connected_to_server.emit()
		elif state == socket.STATE_CLOSED:
			connection_closed.emit()
	while socket.get_ready_state() == socket.STATE_OPEN and socket.get_available_packet_count():
		message_received.emit(get_message())


func _process(_delta):
	poll()
