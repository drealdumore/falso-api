type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "Date"
  | "array"
  | "object"
  | "null"
  | "undefined"
  | "enum"
  | "any";

interface PropertyDefinition {
  name: string;
  type: PropertyType;
  isOptional: boolean;
  isArray: boolean;
  arrayType?: PropertyType;
  objectProperties?: PropertyDefinition[];
  enumValues?: string[]; // Store possible enum values
}

interface InterfaceSchema {
  name: string;
  properties: PropertyDefinition[];
}

/**
 * Parse a TypeScript interface string into a schema
 */
export function parseInterface(interfaceStr: string): InterfaceSchema {
  // Remove comments
  interfaceStr = interfaceStr.replace(/\/\/.*$/gm, "");
  interfaceStr = interfaceStr.replace(/\/\*[\s\S]*?\*\//gm, "");

  // Extract interface name
  const nameMatch = interfaceStr.match(/interface\s+(\w+)/);
  const name = nameMatch ? nameMatch[1] : "Anonymous";

  // Extract properties
  const propertiesMatch = interfaceStr.match(/{([^}]+)}/);

  if (!propertiesMatch) {
    throw new Error("Invalid interface format: could not find properties");
  }

  const propertiesStr = propertiesMatch[1];
  const propertyLines = propertiesStr
    .split(";")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const properties: PropertyDefinition[] = [];

  for (const line of propertyLines) {
    // Match property name, optional flag, and type
    const propertyMatch = line.match(/(\w+)(\?)?:\s*(.+)/);
    if (!propertyMatch) continue;

    const [, propName, optional, typeStr] = propertyMatch;

    let type: PropertyType = "any";
    let isArray = false;
    let arrayType: PropertyType | undefined = undefined;
    let objectProperties: PropertyDefinition[] | undefined = undefined;
    let enumValues: string[] | undefined = undefined;

    // Check if it's an array
    if (typeStr.includes("[]")) {
      isArray = true;
      const baseType = typeStr.replace("[]", "").trim();
      arrayType = mapTypeString(baseType);
    }
    // Check if it's a union type / enum (like 'user' | 'admin' | 'seller')
    else if (typeStr.includes("|")) {
      type = "enum";
      enumValues = parseEnumValues(typeStr);
    }
    // Check if it's an object type
    else if (typeStr.includes("{")) {
      type = "object";
      objectProperties = parseObjectProperties(typeStr);
    }
    // Regular type
    else {
      type = mapTypeString(typeStr);
    }

    properties.push({
      name: propName,
      type,
      isOptional: !!optional,
      isArray,
      arrayType,
      objectProperties,
      enumValues,
    });
  }

  return { name, properties };
}

/**
 * Parse enum values from a union type string
 */
function parseEnumValues(typeStr: string): string[] {
  // Split by | and clean up each value
  return typeStr
    .split("|")
    .map((value) => {
      // Remove quotes and trim whitespace
      value = value.trim();
      if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1);
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
      }
      return value;
    })
    .filter((value) => value.length > 0);
}

/**
 * Parse object properties from a type string
 */
function parseObjectProperties(typeStr: string): PropertyDefinition[] {
  // Extract the object definition
  const objectMatch = typeStr.match(/{([^}]+)}/);
  if (!objectMatch) return [];

  const objectPropsStr = objectMatch[1];
  const propLines = objectPropsStr
    .split(";")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const properties: PropertyDefinition[] = [];

  for (const line of propLines) {
    const propMatch = line.match(/(\w+)(\?)?:\s*(.+)/);
    if (!propMatch) continue;

    const [, propName, optional, propType] = propMatch;

    properties.push({
      name: propName,
      type: mapTypeString(propType),
      isOptional: !!optional,
      isArray: false,
    });
  }

  return properties;
}

/**
 * Map TypeScript type strings to our internal type system
 */
function mapTypeString(typeStr: string): PropertyType {
  const normalizedType = typeStr.trim().toLowerCase();

  if (normalizedType.includes("string")) return "string";
  if (
    normalizedType.includes("number") ||
    normalizedType.includes("int") ||
    normalizedType.includes("float")
  )
    return "number";
  if (normalizedType.includes("boolean") || normalizedType.includes("bool"))
    return "boolean";
  if (normalizedType.includes("date")) return "Date";
  if (normalizedType.includes("null")) return "null";
  if (normalizedType.includes("undefined")) return "undefined";
  if (normalizedType.includes("any")) return "any";

  // Default to 'any' for unknown types
  return "any";
}
