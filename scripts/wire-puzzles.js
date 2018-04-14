let gameScene = new Phaser.Scene('Game');
      
let config = {
    type: Phaser.AUTO, // Phaser will decide how to render (WebGL or Canvas)
    width: 1280,
    height: 720,
    scene: gameScene,
    pixelArt: true
};

let game = new Phaser.Game(config);


//set parameters
gameScene.init = function() {
    this.playerSpeed = 3;
    this.enemySpeed = 2;
    this.enemyMaxY = 280;
    this.enemyMinY = 80;
    this.tileScale = 4;
    this.tileSize = 16;//in pixels
    this.tilePlaceCooldown = 20;
    this.timeSinceTilePlaced = this.tilePlaceCooldown;
    this.previousSelectedTilePos = {x: 0, y: 0};
    this.mapWidth = 10;
    this.mapHeight = 8;
    this.debugModeEnabled = true;
}


//load game assets
gameScene.preload = function() {
    this.load.image('room tiles',           'images/room-tiles.png');
    this.load.spritesheet('room spritesheet', 'images/room-tiles.png', {frameWidth: this.tileSize, frameHeight: this.tileSize});
    this.load.image('powered wire tiles',   'images/powered-wire-tiles.png');
    this.load.image('unpowered wire tiles', 'images/unpowered-wire-tiles.png');
    this.load.image('white wire tiles', 'images/white-wire-tiles.png');
    this.load.image('player', 'images/player.png');
};


//executed once after preload. Used to set up game entities.
gameScene.create = function() {

    //keyboard
    let keyCodes = Phaser.Input.Keyboard.KeyCodes;
    let keysToRemember = ['W', 'S', 'A', 'D', 'Q', 'E', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'];
    let keyCodesToRemember = {};
    let key = '';
    for (var i = 0; i < keysToRemember.length; i++) {
        key = keysToRemember[i]
        keyCodesToRemember[key] =  Phaser.Input.Keyboard.KeyCodes[key];
    }
    this.keys = this.input.keyboard.addKeys(keyCodesToRemember);

    //colors
    this.colors = {
        powered_blue: Phaser.Display.Color.GetColor(232,143,61),
        unpowered_blue: Phaser.Display.Color.GetColor(166,72,44)
    }

    //camera controls
    let cam = this.cameras.main;
    cam.setBackgroundColor(0x555555);
    // this.cameras.main.setZoom(4);
    // this.cameras.main.setScroll(-config.width, -config.height);

    var controlConfig = {
        camera: this.cameras.main,
        left: this.keys.LEFT,
        right: this.keys.RIGHT,
        up: this.keys.UP,
        down: this.keys.DOWN,
        speed: 0.5,
        zoomOut: this.keys.Q,
        zoomIn: this.keys.E
    };

    // this.camControls = new Phaser.Cameras.Controls.Fixed(controlConfig);

    //tilemap
    this.map = this.make.tilemap({
        tileWidth: this.tileSize,
        tileHeight: this.tileSize,
        width: this.mapWidth,
        height: this.mapHeight 
    });

    var roomTileset = this.map.addTilesetImage('room tiles');
    this.roomTiles = {
        floor: 0,
        wall: 1,
        output: 2,
        input: 3,
        hardTWall: 4, //toggleable wall
        softTWall: 5
    }
    this.drawTile = this.roomTiles.wall;
    var poweredWireTiles = this.map.addTilesetImage('powered wire tiles');
    var unpoweredWireTiles = this.map.addTilesetImage('unpowered wire tiles');
    var whiteWireTiles = this.map.addTilesetImage('white wire tiles');

    var ground = this.map.createBlankDynamicLayer('room', roomTileset);
    var wires = this.map.createBlankDynamicLayer('wires', whiteWireTiles);
    ground.fill(1);
    ground.fill(0, 1, 1, this.map.width-2, this.map.height-2);

    this.mapScaleGroup = this.add.group();
    this.mapScaleGroup.add(ground);
    this.mapScaleGroup.add(wires);
    Phaser.Actions.ScaleXY(this.mapScaleGroup.getChildren(), this.tileScale, this.tileScale);

    this.marker = this.add.graphics();
    this.marker.lineStyle(3, 0x000000, 1);
    this.marker.strokeRect(0, 0, this.map.tileWidth*(this.tileScale+1), this.map.tileHeight*(this.tileScale+1));

    //pick tile gui
    this.tile = this.add.sprite(900, 40, 'room spritesheet', 2);
    let scaledTileSize = this.tileSize*(this.tileScale+1);
    let mapEdge = this.map.tileToWorldX(this.map.width) + 50;
    var tileSelectGroup = this.add.group([
        {
            key: 'room spritesheet',
            frame: [0, 1, 2],
            setXY: { x: mapEdge, y: 0, stepX: scaledTileSize },
            setScale: { x: this.tileScale+1, y: this.tileScale+1 }
        }, 
        {
            key: 'room spritesheet',
            frame: [3, 4, 5],
            setXY: { x: mapEdge, y: 0+scaledTileSize, stepX: scaledTileSize },
            setScale: { x: this.tileScale+1, y: this.tileScale+1 }
        }
    ]);
    // Phaser.Actions.SetOrigin(tileSelectGroup.getChildren(), 0, 0);
    Phaser.Actions.IncXY(tileSelectGroup.getChildren(), scaledTileSize/2, scaledTileSize/2);
    Phaser.Actions.Call(tileSelectGroup.getChildren(), function(tile) {
        tile.setInteractive();
        tile.on("pointerdown", function(pointer) {
            this.scene.drawTile = this.frame.name;
            this.scene.selectedTileMarker.setPosition(this.getTopLeft().x, this.getTopLeft().y);
            // this.scene.selectedTileMarker.setPosition(100, 100);
        });
    }, this);

    let selectedTileCoords = tileSelectGroup.getChildren()[this.drawTile].getTopLeft();
    this.selectedTileMarker = this.add.graphics();
    this.selectedTileMarker.lineStyle(5, 0x000000, 1);
    this.selectedTileMarker.strokeRect(0, 0, this.map.tileWidth*(this.tileScale+1), this.map.tileHeight*(this.tileScale+1));
    this.selectedTileMarker.setPosition(selectedTileCoords.x, selectedTileCoords.y);

    //player
    this.player = this.add.sprite(this.map.tileToWorldX(2.5), this.map.tileToWorldY(2.5), 'player');
    this.player.setScale(this.tileScale+1);
    this.player.moveDirection = '';
    this.player.speed = this.playerSpeed;

    this.player.update = function() {
        // console.log(this.directionMoving);
        let tileX = this.scene.map.tileToWorldX(this.scene.map.worldToTileX(this.x)+0.5);
        let tileY = this.scene.map.tileToWorldY(this.scene.map.worldToTileY(this.y)+0.5);
        if (this.x !== tileX) {
            let dx = Math.min(this.speed, Math.abs(tileX - this.x));
            dx *= (this.directionMoving === 'E') ? -1 : 1;
            this.x += dx;
        }
        else if (this.y !== tileY) {
            let dy = Math.min(this.speed, Math.abs(tileY - this.y));
            dy *= (this.directionMoving === 'N') ? -1 : 1;
            this.y += dy;
        }
        else if (this.x === tileX && this.y === tileY) {
            this.directionMoving = '';
        };
        // if (this.directionMoving === 'N') {
        //     if(this.x != tileX)
        // }
    }

    this.player.move = function(dir) {
        //update all wires
        if (this.directionMoving !== '') return;
        let dx = 0;
        let dy = 0;
        if      (dir === 'N') dy = -1;
        else if (dir === 'S') dy = 1;
        else if (dir === 'E') dx = -1;
        else if (dir === 'W') dx = 1;
        else return;//invalid dir

        let tileX = this.scene.map.worldToTileX(this.x)+dx;
        let tileY = this.scene.map.worldToTileY(this.y)+dy;
        let tile =this.scene.map.getTileAt(tileX, tileY, true, 'room');
        if (tile === null ||
            !(tile.index === this.scene.roomTiles.floor || 
              tile.index === this.scene.roomTiles.softTWall)) return; //will hit wall;

        this.directionMoving = dir;
        this.x += this.speed*dx;
        this.y += this.speed*dy;
    };

};


gameScene.update = function(time, delta) {

    // this.camControls.update(delta);

    var mousePos = this.input.activePointer.positionToCamera(this.cameras.main);
    //get world coords of tile mouse is in.
    var mouseTileX = Math.max(Math.min(this.map.worldToTileX(mousePos.x), this.map.width-1), 0);
    var mouseTileY = Math.max(Math.min(this.map.worldToTileY(mousePos.y), this.map.height-1), 0);
    this.marker.x = this.map.tileToWorldX(mouseTileX);
    this.marker.y = this.map.tileToWorldY(mouseTileY);

    if(this.previousSelectedTilePos.x != mouseTileX || this.previousSelectedTilePos.y != mouseTileY) this.timeSinceTilePlaced = this.tilePlaceCooldown;
    this.previousSelectedTilePos.x = mouseTileX;
    this.previousSelectedTilePos.y = mouseTileY;

    //place wire
    if (this.input.manager.activePointer.isDown && 
        this.map.worldToTileX(mousePos.x) < this.map.width && 
        this.map.worldToTileY(mousePos.y) < this.map.height) 
            this.placeRoomTileAt(mouseTileX, mouseTileY);

    this.timeSinceTilePlaced += 1;

    //update wires

    //move player
    this.player.update();
    if (this.keys.SPACE.isDown && this.player.directionMoving === '' && this.timeSinceTilePlaced >= this.tilePlaceCooldown) {
        this.toggleWireAt(this.map.worldToTileX(this.player.x), this.map.worldToTileY(this.player.y));
        this.timeSinceTilePlaced = 0;
    }

    if (this.keys.UP.isDown || this.keys.W.isDown) this.player.move('N');
    else if (this.keys.DOWN.isDown || this.keys.S.isDown) this.player.move('S');
    else if (this.keys.LEFT.isDown || this.keys.A.isDown) this.player.move('E');
    else if (this.keys.RIGHT.isDown || this.keys.D.isDown) this.player.move('W');
};

gameScene.placeRoomTileAt = function (x, y) {
    if (this.timeSinceTilePlaced <= this.tilePlaceCooldown) return;
    this.map.putTileAt(this.drawTile, x, y, false, 'room');
    this.timeSinceTilePlaced = 0;
};

gameScene.toggleWireAt = function(x, y) {
    this.map.setLayer('wires');
    if (this.map.getTileAt(x, y) != null) {
        this.map.getTileAt(x, y).break();
    }
    else {
        let tile = this.map.putTileAt(0, x, y)
        Wire.call(tile);
    }
};

//intended to be called on a tile
function Wire() {
    this.power = -1; //higher = farther from source, -1 = unpowered
    this.north = false;
    this.south = false;
    this.east = false;
    this.west = false;

    this.debugText = gameScene.add.text(this.tilemap.tileToWorldX(this.x+0.5), this.tilemap.tileToWorldY(this.y+0.5), -1, {
        color: 'black'
    });
    this.debugText.setVisible(gameScene.debugModeEnabled);
    
    var connectableTiles = [gameScene.roomTiles.input, gameScene.roomTiles.output];
    var tileDirectionIndicies = {
        '': 0,
        'N': 1,   'S': 1,    'NS': 1,
        'E': 2,   'W': 2,    'EW': 2,
        'SE': 3,  'SEW': 4,  'SW': 5,
        'NSE': 6, 'NSEW': 7, 'NSW': 8,
        'NE': 9,  'NEW': 10, 'NW': 11
    }

    this.update = function() {
        console.log(this.x, this.y);

        //update connections
        this.north = this.isConnectableWith(this.x, this.y-1);
        this.south = this.isConnectableWith(this.x, this.y+1);
        this.east = this.isConnectableWith(this.x+1, this.y);
        this.west = this.isConnectableWith(this.x-1, this.y);

        this.index = this.getDirectionIndex();

        let oldPower = this.power;

        //check for neighboring outlets
        let foundPoweringNeighbor = false;
        this.getRoomNeighbors().forEach(function(tile) {
            if (tile.index === gameScene.roomTiles.output) {
                this.power = 0;
                foundPoweringNeighbor = true;
            }
        }, this);

        //get power from neighboring wires
        this.getWireNeighbors().forEach(function(wire) {
            if (wire.power === this.power - 1 && wire.power !== -1) foundPoweringNeighbor = true;
            if (wire.power !== -1  && (wire.power < this.power-1 || this.power === -1)) {
                this.power = wire.power + 1;
                foundPoweringNeighbor = true;
            }
        }, this);


        if (!foundPoweringNeighbor) {
            this.power = -1;
        }

        //update neighbors
        this.getWireNeighbors().forEach(function(wire) {
            if (this.power === -1) {
                if (wire.power === oldPower + 1) {
                    //update wire that was being powered by this
                    wire.update();
                }
            } else {
                if (wire.power === -1 || wire.power > this.power+1) {
                    //update wire that should be powered by this
                    wire.update();
                }
            }
        }, this);

        if (gameScene.debugModeEnabled) this.debugText.setText(this.power);

        //set color
        if (this.power >= 0) this.tint = gameScene.colors.powered_blue;
        else this.tint = gameScene.colors.unpowered_blue;

    }

    this.isConnectableWith = function(x, y) {
        let tile = this.tilemap.getTileAt(x, y, true, 'wires');
        if (tile.index !== -1) return true;

        tile = this.tilemap.getTileAt(x, y, true, 'room');
        if (connectableTiles.indexOf(tile.index) != -1) return true;
        return false;
    }

    this.getDirectionIndex = function() {
        let dir = '';
        if (this.north) dir += 'N';
        if (this.south) dir += 'S';
        if (this.east) dir += 'E';
        if (this.west) dir += 'W';
        return tileDirectionIndicies[dir];
    }

    this.getWireNeighbors = function() {
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'wires');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'wires');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'wires');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'wires');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    }

    this.getRoomNeighbors = function() {
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'room');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'room');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'room');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'room');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    }

    this.break = function() {
        this.index = -1;
        // this.setPower(-1);
        this.power = -1;
        this.getWireNeighbors().forEach(function(wire) {
            wire.update();
        });
        this.tilemap.putTileAt(-1, this.x, this.y, null, 'wires');
        this.debugText.destroy();
    }

    this.update();
    this.getWireNeighbors().forEach(function(wire) {
        wire.update();
    });
}