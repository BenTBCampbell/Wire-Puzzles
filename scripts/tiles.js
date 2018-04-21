var PuzzleTile = new Phaser.Class({

    Extends: Phaser.Tilemaps.Tile,

    initialize: function (index, x, y, data, layer) 
    {
        layer = (layer !== undefined) ? layer : 'room';
        if ( !( layer instanceof Phaser.Tilemaps.LayerData ) )
            layer = gameScene.level.map.getLayer( layer );
        Phaser.Tilemaps.Tile.call( this, layer, index, x, y, gameScene.tileSize, gameScene.tileSize );


        this.defaultData = {
            isSolid: true,
            isActive: false,
            flags: []
        };

        this.setData(data);
    },

    getData: function ()
    {
        var tileName = "unknown";
        for(var name in TILES) {
            if (TILES[name] === this.index) 
            {
                tileName = name;
                break;
            }
        }
        // return {
        //     index: this.index,
        //     type: tileName
        // }
        return this.index
    },

    setData: function (data)
    {
        data = (data === undefined || data === null) ? {} : data;
        for (var attr in this.defaultData)
        {
            this[attr] = (data[attr] === undefined || data[attr] === null) ? this.defaultData[attr] : data[attr];
        }
    },

    setActive: function (isActive)
    {
        this.isActive = isActive;
    }
});

var TILES = 
{
    floor: 0,
    wall: 1,
    charger: 2,
    activator: 3,
    flaggedWall: 4, //toggleable wall
    flaggedFloor: 5
}

PuzzleTile.makeFromIndex = function (index, x, y, data, layer) 
{
    switch (index) {
        default:
            return new PuzzleTile(index, x, y, data, layer);
            break;

        case TILES.floor:
            return new Floor(x, y, data, layer);
            break;

        case TILES.wall:
            var tile = new Floor(x, y, data, layer);
            tile.setActive(true);
            return tile;
            break;

        case TILES.charger:
            return new Charger(x, y, data, layer);
            break;

        case TILES.activator:
            return new Activator(x, y, data, layer);
            break;
    }
}

var Floor = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.floor, x, y, data, layer);

        this.defaultData.isSolid = false;
        this.setData(data);
    },

    setActive: function (isActive)
    {
        this.isActive = isActive;
        if ( this.isActive )
            {
                this.isSolid = true;
                this.index = (this.flags.length > 0) ? TILES.flaggedWall : TILES.wall;
            }
        else if (!this.isActive)
        {
            this.isSolid = false;
            this.index = (this.flags.length > 0) ? TILES.flaggedFloor : TILES.floor;
        }
    }
});

var Charger = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.charger, x, y, data, layer);

        this.setData(data);
    }
});

var Activator = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.activator, x, y, data, layer);

        this.defaultData.flags = ['0'];
        this.setData(data);
    },

    checkIfActive: function ()
    {
        var neighbors = []
        neighbors.push(gameScene.level.wires.getTileAt(this.x, this.y+1));
        neighbors.push(gameScene.level.wires.getTileAt(this.x, this.y-1));
        neighbors.push(gameScene.level.wires.getTileAt(this.x+1, this.y));
        neighbors.push(gameScene.level.wires.getTileAt(this.x-1, this.y));

        this.isActive = false;
        for (var i = 0; i < neighbors.length; i ++)
        {
            if (
                neighbors[i] !== null && 
                neighbors[i].isConnectableWith(this.x, this.y) &&
                neighbors[i].powered
            ) {
                this.isActive = true;
                break;
            }
        }

        return this.isActive;
    }
});

var Wire = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer) 
    {
        layer = (layer !== undefined) ? layer : 'wires';        
        PuzzleTile.call(this, 0, x, y, data, layer);

        this.powered = false;
        this.north = false;
        this.south = false;
        this.east = false;
        this.west = false;

        this.connectableTiles = [TILES.charger, TILES.activator];
        this.tileDirectionIndicies = {
            '': 0,
            'N': 1,   'S': 1,    'NS': 1,
            'E': 2,   'W': 2,    'EW': 2,
            'SE': 3,  'SEW': 4,  'SW': 5,
            'NSE': 6, 'NSEW': 7, 'NSW': 8,
            'NE': 9,  'NEW': 10, 'NW': 11
        }
    },

    findPathToPowerSource:  function (checkedTiles) 
    {
        if(checkedTiles.indexOf(this) !== -1) return false;
        if (this.isConnectedToCharger()) return true;
        else {
            checkedTiles.push(this);
            var neighbors = this.getWireNeighbors();
            for (var i=0; i<neighbors.length; i++) 
            {
                if (neighbors[i].findPathToPowerSource(checkedTiles)) return true;
            }
        }
        return false;
    },

    isConnectableWith: function (x, y) 
    {
        let tile = this.tilemap.getTileAt(x, y, true, 'wires');
        if (tile.index !== -1) return true;

        tile = this.tilemap.getTileAt(x, y, true, 'room');
        if (this.connectableTiles.indexOf(tile.index) != -1) return true;
        return false;
    },

    getDirectionIndex: function () 
    {
        let dir = '';
        if (this.north) dir += 'N';
        if (this.south) dir += 'S';
        if (this.east) dir += 'E';
        if (this.west) dir += 'W';
        return this.tileDirectionIndicies[dir];
    },

    getWireNeighbors: function () 
    {
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
    },

    getRoomNeighbors: function () 
    {
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
    },

    isConnectedToCharger: function () 
    {
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
            if (neighbors[i] instanceof Charger) return true;

        return false;
    },

    isConnectedToActivator: function () 
    {
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
            if (neighbors[i] instanceof Activator) return true;

        return false;
    },

    break: function () 
    {
        this.tilemap.putTileAt(-1, this.x, this.y, null, 'wires');
        gameScene.level.updateWires();
    },

    updateColor: function () 
    {
        //set color
        if (this.powered === true)
            this.tint = gameScene.colors.powered_blue;
        else
            this.tint = gameScene.colors.unpowered_blue;
    },

    updateConnections: function () 
    {
        this.north = this.isConnectableWith(this.x, this.y - 1);
        this.south = this.isConnectableWith(this.x, this.y + 1);
        this.east = this.isConnectableWith(this.x + 1, this.y);
        this.west = this.isConnectableWith(this.x - 1, this.y);
        this.index = this.getDirectionIndex();
    }
});