var Level = new Phaser.Class({

    initialize: function(width, height, room, wires)
    {
        width = (width === undefined || width === null) ? 5 : width;
        height = (height === undefined || height === null) ? 5 : height;
        //set up tilemap
        this.map = gameScene.make.tilemap({
            tileWidth: gameScene.tileSize,
            tileHeight: gameScene.tileSize,
            width: width,
            height: height 
        });

        var roomTileset = this.map.addTilesetImage('room tiles');
        var whiteWireTiles = this.map.addTilesetImage('white wire tiles');


        this.room = this.map.createBlankDynamicLayer('room', roomTileset);
        this.wires = this.map.createBlankDynamicLayer('wires', whiteWireTiles);


        //default room
        if (room === undefined || room === null)
        {
            room = [];
            for (var y = 0; y < height; y ++)
            {
                room.push([]);
                for (var x = 0; x < width; x ++)
                {
                    room[y][x] = ( x === 0 || y === 0 || x === width - 1 || y === height - 1 ) ? TILES.wall : TILES.floor;
                }
            }   
        }

        //default wires
        if (wires === undefined || wires === null)
        {
            wires = [];
            for (var y = 0; y < height; y ++)
            {
                wires.push([]);
                for (var x = 0; x < width; x ++)
                    wires[y][x] = -1;
            }   
        }

        //fill tilemap with tiles
        for (var y = 0; y < height; y ++)
        {
            for (var x = 0; x < width; x ++)
            {
                if (wires[y][x] !== -1) 
                {
                    var data = (wires[y][x] instanceof Object) ? wires[y][x] : null;
                    console.log(data);
                    this.add(new Wire(x, y, data, this.wires.layer));
                }
                else
                    this.wires.putTileAt(-1, x, y);

                if (room[y][x] !== -1)
                {
                    var data = null;
                    var index = room[y][x];
                    if (room[y][x] instanceof Object)
                    {
                        //tile with custom data found
                        data = room[y][x];
                        index = data.index;
                        console.log(index, data);
                    }
                    this.add(PuzzleTile.makeFromIndex(index, x, y, data, this.room.layer));
                }
                else
                    this.room.putTileAt(-1, x, y);
            }
        }
        this.updateWires();

        //scale tiles
        var mapScaleGroup = gameScene.add.group();
        mapScaleGroup.add(this.room);
        mapScaleGroup.add(this.wires);
        Phaser.Actions.ScaleXY(mapScaleGroup.getChildren(), gameScene.tileScale, gameScene.tileScale);

        //move player to start position
        var start = this.room.findByIndex(TILES.start);
        if (start === null) start = {x: 2, y: 2};
        gameScene.player.setPosition(this.map.tileToWorldX( start.x + 0.5 ), this.map.tileToWorldY( start.y + 0.5 ));
        gameScene.player.directionMoving = '';

        this.startData = this.getAsData();
    },

    add: function (tile) 
    {
        if (tile.x >= this.map.width || tile.y >= this.map.height) return;
        if (tile instanceof Wire) 
            this.wires.layer.data[tile.y][tile.x] = tile;
        else
            this.room.layer.data[tile.y][tile.x] = tile;
    },

    updateWires: function ()
    {
        var wires = this.map.getTilesWithin(0, 0, undefined, undefined, {isNotEmpty: true}, 'wires');
        for (var i=0; i < wires.length; i++) 
        {
            wires[i].updateConnections();
        }
        for (var i=0; i < wires.length; i++) 
        {
            var checkedTiles = []
            wires[i].powered = wires[i].findPathToPowerSource(checkedTiles);
            wires[i].updateColor();

            // if(wires[i].isConnectedToActivator() && wires[i].powered) 
            // {
            //     this.updateFlaggedTiles();
            // }
        }
        this.updateFlaggedTiles();
    },

    updateFlaggedTiles: function () 
    {
        var flags = {}

        //find out what flags are active or not
        var tiles = this.room.getTilesWithin(0, 0, undefined, undefined, {isNotEmpty: true});
        for ( var i = 0; i < tiles.length; i++ ) 
        {
            if ( tiles[i].index === TILES.activator ) 
            {
                tiles[i].checkIfActive();
                for ( var j = 0; j < tiles[i].flags.length; j ++ )
                {
                    var tileFlag = parseFlag(tiles[i].flags[j]);
                    if ( flags[tileFlag.name] === undefined) 
                        flags[tileFlag.name] = (tileFlag.isInverted) ? !tiles[i].isActive : tiles[i].isActive;
                    else if ( tiles[i].isActive && !tileFlag.isInverted)
                        flags[tiles[i].flags[j]] = true;
                    else if ( !tiles[i].isActive && tileFlag.isInverted)
                        flags[tiles[i].flags[j]] = true;
                }
            }
        }

        //update flagged tiles
        for ( var tileI = 0; tileI < tiles.length; tileI ++ ) 
        {
            for ( var flagI = 0; flagI < tiles[tileI].flags.length; flagI ++ )
            {
                var tileFlag = parseFlag(tiles[tileI].flags[flagI]);
                tiles[tileI].setActive( tileFlag.isInverted ? !flags[tileFlag.name] : flags[tileFlag.name] );
            }
        }
    },

    getAsData:  function ()
    {
        var name = document.getElementById('level-name').value;
        name = (name !== '') ? name : 'level';
        var level = {
            name: name,
            width: this.map.width,
            height: this.map.height,
            wires: [],
            room: []
        };

        for (var y = 0; y < level.height; y ++)
        {
            level.wires.push([]);
            level.room.push([]);
            for (var x = 0; x < level.width; x ++)
            {
                var tile = this.wires.getTileAt(x, y);
                if (tile === null)
                    level.wires[y][x] = -1;
                else 
                {
                    var data = tile.getData();
                    if (Object.keys(data).length > 1)
                        level.wires[y][x] = data;
                    else
                        level.wires[y][x] = data.index;
                }

                var tile = this.room.getTileAt(x, y);
                if (tile === null)
                    level.room[y][x] = -1;
                else 
                {
                    var data = tile.getData();
                    if (Object.keys(data).length > 1)
                        level.room[y][x] = data;
                    else
                        level.room[y][x] = data.index;
                }
            }
        }

        return level;
    }
});